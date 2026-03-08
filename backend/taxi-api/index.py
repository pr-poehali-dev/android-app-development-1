"""Taxi API"""
import json
import os
import psycopg2
import psycopg2.extras


CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-User-Id, X-Auth-Token, X-Session-Id',
    'Access-Control-Max-Age': '86400',
}
SCH = os.environ.get('MAIN_DB_SCHEMA', 'public')


def get_conn():
    c = psycopg2.connect(os.environ['DATABASE_URL'], options='-c search_path=' + SCH)
    c.autocommit = True
    return c


def ok(body):
    return {'statusCode': 200, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps(body, default=str)}


def err(code, msg):
    return {'statusCode': code, 'headers': {**CORS, 'Content-Type': 'application/json'}, 'body': json.dumps({'error': msg})}


def e(v):
    return '' if v is None else str(v).replace("'", "''")


def ns(v):
    return 'NULL' if v is None else "'%s'" % e(v)


def handler(event, context):
    """Единый API бэкенда такси-сервиса Taxi"""
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    act = (event.get('queryStringParameters') or {}).get('action', '')
    b = json.loads(event['body']) if event.get('body') else {}
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    try:
        if act == 'ping':
            return ok({'ok': True})

        if act == 'auth-passenger':
            raw_ph = b.get('phone', '')
            ph = e(raw_ph.replace(' ', '').replace('-', '').replace('(', '').replace(')', ''))
            cur.execute("SELECT id,name,phone,role FROM users WHERE REPLACE(phone,' ','')='%s' AND role='passenger'" % ph)
            r = cur.fetchone()
            if r:
                return ok(dict(r))
            uid = e(b.get('id', ''))
            nm = e(b.get('name', 'Пассажир'))
            cur.execute("INSERT INTO users(id,name,phone,role) VALUES('%s','%s','%s','passenger')" % (uid, nm, ph))
            return ok({'id': uid, 'name': nm, 'phone': ph, 'role': 'passenger'})

        if act == 'auth-driver':
            cur.execute("SELECT id,name,phone FROM drivers WHERE login='%s' AND password='%s'" % (e(b.get('login')), e(b.get('password'))))
            r = cur.fetchone()
            if not r:
                return err(401, 'Неверный логин или пароль')
            return ok({'id': r['id'], 'name': r['name'], 'phone': r['phone'], 'role': 'driver'})

        if act == 'auth-admin':
            cur.execute("SELECT admin_password FROM app_settings WHERE id=1")
            r = cur.fetchone()
            if not r or b.get('login') != 'admin' or b.get('password') != r['admin_password']:
                return err(401, 'Неверный логин или пароль')
            return ok({'id': 'admin_1', 'name': 'Администратор', 'phone': '', 'role': 'admin'})

        if act == 'get-state':
            cur.execute("SELECT * FROM app_settings WHERE id=1")
            sr = cur.fetchone()
            st = fmt_settings(sr) if sr else {}
            cur.execute("SELECT * FROM drivers ORDER BY created_at")
            dr = [fmt_driver(r) for r in cur.fetchall()]
            cur.execute("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200")
            od = [fmt_order(r) for r in cur.fetchall()]
            cur.execute("SELECT id,name,phone,role,registered_at FROM users WHERE role='passenger' ORDER BY created_at")
            pa = [{'id': r['id'], 'name': r['name'], 'phone': r['phone'], 'role': r['role'], 'registeredAt': str(r.get('registered_at', ''))[:10]} for r in cur.fetchall()]
            cur.execute("SELECT * FROM support_messages ORDER BY msg_timestamp")
            sm = [fmt_sup(r) for r in cur.fetchall()]
            return ok({'settings': st, 'drivers': dr, 'orders': od, 'passengers': pa, 'supportMessages': sm})

        if act == 'create-order':
            o = b
            op = o.get('options', {})
            cur.execute("INSERT INTO orders(id,passenger_id,passenger_name,passenger_phone,from_address,to_address,tariff,children,children_count,luggage,comment,delivery_description,cargo_description,status,payment_method,tips,discount,distance_km,price,scheduled_at,free_at) VALUES('%s','%s','%s','%s','%s','%s','%s',%s,%s,%s,'%s',%s,%s,'pending','%s',%s,%s,%s,%s,%s,NOW())" % (
                e(o['id']), e(o['passengerId']), e(o['passengerName']), e(o.get('passengerPhone', '')),
                e(o.get('from', '')), e(o.get('to', '')), e(o['tariff']),
                str(op.get('children', False)).lower(), op.get('childrenCount', 0),
                str(op.get('luggage', False)).lower(), e(op.get('comment', '')),
                ns(op.get('deliveryDescription')), ns(op.get('cargoDescription')),
                e(o.get('paymentMethod', 'cash')), o.get('tips', 0), o.get('discount', 0),
                o.get('distanceKm', 0), o.get('price', 0), ns(o.get('scheduledAt'))))
            return ok({'ok': True})

        if act == 'update-order':
            cur.execute("UPDATE orders SET status='%s' WHERE id='%s'" % (e(b.get('status')), e(b.get('orderId'))))
            return ok({'ok': True})

        if act == 'cancel-order':
            cur.execute("UPDATE orders SET status='cancelled',cancelled_by='%s' WHERE id='%s'" % (e(b.get('cancelledBy', 'passenger')), e(b.get('orderId'))))
            return ok({'ok': True})

        if act == 'accept-order':
            did = e(b.get('driverId'))
            cur.execute("SELECT car_display FROM drivers WHERE id='%s'" % did)
            dr = cur.fetchone()
            dcar = dr['car_display'] if dr else ''
            cur.execute("UPDATE orders SET status='assigned',driver_id='%s',driver_name='%s',driver_car='%s',eta_minutes=%s WHERE id='%s'" % (
                did, e(b.get('driverName')), e(dcar), b.get('eta', 5), e(b.get('orderId'))))
            return ok({'ok': True})

        if act == 'update-settings':
            s = b
            tc = json.dumps(s.get('timeCoefficients', []))
            cur.execute("UPDATE app_settings SET price_first_km=%s,price_per_km=%s,price_per_hour=%s,price_delivery=%s,price_waiting_per_min=%s,auto_assign_radius_km=%s,free_order_timeout_ms=%s,global_discount=%s,km_discount_threshold=%s,km_discount=%s,auto_assign_mode='%s',time_coefficients='%s',admin_password='%s',updated_at=NOW() WHERE id=1" % (
                s.get('priceFirstKm', 80), s.get('pricePerKm', 25), s.get('pricePerHour', 450), s.get('priceDelivery', 300),
                s.get('priceWaitingPerMin', 5), s.get('autoAssignRadiusKm', 5), s.get('freeOrderTimeoutMs', 240000),
                s.get('globalDiscount', 0), s.get('kmDiscountThreshold', 4), s.get('kmDiscount', 0),
                e(s.get('autoAssignMode', 'rating')), tc.replace("'", "''"), e(s.get('adminPassword', 'admin75reg'))))
            return ok({'ok': True})

        if act == 'update-driver':
            import re
            did = e(b.get('id', ''))
            ch = b.get('changes', {})
            sets = []
            for k, v in ch.items():
                col = re.sub('([a-z0-9])([A-Z])', r'\1_\2', re.sub('(.)([A-Z][a-z]+)', r'\1_\2', k)).lower()
                if isinstance(v, bool):
                    sets.append("%s=%s" % (col, str(v).lower()))
                elif isinstance(v, (int, float)):
                    sets.append("%s=%s" % (col, v))
                elif isinstance(v, str):
                    sets.append("%s='%s'" % (col, v.replace("'", "''")))
            if sets:
                cur.execute("UPDATE drivers SET %s WHERE id='%s'" % (','.join(sets), did))
            return ok({'ok': True})

        if act == 'add-driver':
            d = b
            login = e(d.get('login', ''))
            if not login:
                return err(400, 'Логин обязателен')
            cur.execute("SELECT id FROM drivers WHERE login='%s'" % login)
            if cur.fetchone():
                return err(400, 'Водитель с таким логином уже существует')
            uid = e(d['id'])
            cur.execute("INSERT INTO users(id,name,phone,role) VALUES('%s','%s','%s','driver') ON CONFLICT(id) DO NOTHING" % (uid, e(d['name']), e(d.get('phone', ''))))
            ci = d.get('carInfo', {})
            cur.execute("INSERT INTO drivers(id,user_id,name,phone,login,password,car_brand,car_model,car_plate,car_display,rating,status,auto_assign,subscription_days,free_work,has_ads,priority) VALUES('%s','%s','%s','%s','%s','%s','%s','%s','%s','%s',%s,'%s',%s,%s,%s,%s,%s)" % (
                uid, uid, e(d['name']), e(d.get('phone', '')), login, e(d.get('password', '')),
                e(ci.get('brand', '')), e(ci.get('model', '')), e(ci.get('plateNumber', '')),
                e(d.get('car', '')), d.get('rating', 5.0), e(d.get('status', 'active')),
                str(d.get('autoAssign', False)).lower(), d.get('subscriptionDays', 0),
                str(d.get('freeWork', False)).lower(), str(d.get('hasAds', False)).lower(), d.get('priority', 1)))
            return ok({'ok': True})

        if act == 'toggle-auto-assign':
            cur.execute("UPDATE drivers SET auto_assign=NOT auto_assign WHERE id='%s'" % e(b.get('driverId', '')))
            return ok({'ok': True})

        if act == 'update-driver-car':
            did = e(b.get('driverId', ''))
            ci = b.get('carInfo', {})
            br, mo, pl = e(ci.get('brand', '')), e(ci.get('model', '')), e(ci.get('plateNumber', ''))
            cur.execute("UPDATE drivers SET car_brand='%s',car_model='%s',car_plate='%s',car_display='%s %s • %s' WHERE id='%s'" % (br, mo, pl, br, mo, pl, did))
            return ok({'ok': True})

        if act == 'send-support':
            m = b
            cur.execute("INSERT INTO support_messages(id,from_id,from_name,from_role,text,time,msg_timestamp,read) VALUES('%s','%s','%s','%s','%s','%s',%s,%s)" % (
                e(m['id']), e(m['fromId']), e(m['fromName']), e(m['fromRole']), e(m['text']), e(m['time']), m['timestamp'], str(m.get('read', False)).lower()))
            return ok({'ok': True})

        if act == 'get-driver-chat':
            cur.execute("SELECT id,driver_id,driver_name,text,created_at FROM driver_chat ORDER BY created_at DESC LIMIT 100")
            rows = cur.fetchall()
            msgs = [{'id': r['id'], 'driverId': r['driver_id'], 'driverName': r['driver_name'], 'text': r['text'], 'time': str(r['created_at'])[11:16], 'timestamp': int(r['created_at'].timestamp() * 1000)} for r in rows]
            msgs.reverse()
            return ok({'messages': msgs})

        if act == 'send-driver-chat':
            did = e(b.get('driverId', ''))
            dn = e(b.get('driverName', ''))
            txt = e(b.get('text', ''))
            if not txt:
                return err(400, 'Empty message')
            cur.execute("INSERT INTO driver_chat(driver_id,driver_name,text) VALUES('%s','%s','%s') RETURNING id,created_at" % (did, dn, txt))
            r = cur.fetchone()
            return ok({'id': r['id'], 'time': str(r['created_at'])[11:16], 'timestamp': int(r['created_at'].timestamp() * 1000)})

        if act == 'rate-driver':
            did = e(b.get('driverId', ''))
            rt = b.get('rating', 5)
            cur.execute("SELECT rating,trips_count FROM drivers WHERE id='%s'" % did)
            r = cur.fetchone()
            if r:
                t = float(r['rating']) * int(r['trips_count']) + rt
                nc = int(r['trips_count']) + 1
                cur.execute("UPDATE drivers SET rating=%s,trips_count=%s WHERE id='%s'" % (round(t / nc, 1), nc, did))
            return ok({'ok': True})

        if act == 'send-ride-chat':
            oid = e(b.get('orderId', ''))
            sr = e(b.get('senderRole', ''))
            sid = e(b.get('senderId', ''))
            sn = e(b.get('senderName', ''))
            txt = e(b.get('text', ''))
            if not txt:
                return err(400, 'Empty message')
            cur.execute("INSERT INTO ride_chat(order_id,sender_role,sender_id,sender_name,text) VALUES('%s','%s','%s','%s','%s') RETURNING id,created_at" % (oid, sr, sid, sn, txt))
            r = cur.fetchone()
            return ok({'id': r['id'], 'time': str(r['created_at'])[11:16]})

        if act == 'get-ride-chat':
            oid = e(b.get('orderId', ''))
            cur.execute("SELECT id,order_id,sender_role,sender_id,sender_name,text,created_at FROM ride_chat WHERE order_id='%s' ORDER BY created_at" % oid)
            msgs = [{'id': r['id'], 'orderId': r['order_id'], 'from': r['sender_role'], 'senderId': r['sender_id'], 'senderName': r['sender_name'], 'text': r['text'], 'time': str(r['created_at'])[11:16]} for r in cur.fetchall()]
            return ok({'messages': msgs})

        if act == 'complete-order':
            oid = e(b.get('orderId', ''))
            did = e(b.get('driverId', ''))
            cur.execute("UPDATE orders SET status='done' WHERE id='%s'" % oid)
            cur.execute("SELECT distance_km,price FROM orders WHERE id='%s'" % oid)
            o = cur.fetchone()
            if o and did:
                km = float(o['distance_km'])
                earn = float(o['price'])
                cur.execute("UPDATE drivers SET trips_count=trips_count+1,total_earnings=total_earnings+%s,total_km=total_km+%s WHERE id='%s'" % (earn, km, did))
            return ok({'ok': True})

        return err(404, 'Unknown action')
    except Exception as ex:
        return err(500, str(ex))
    finally:
        cur.close()
        conn.close()


def fmt_settings(r):
    tc = r['time_coefficients']
    if isinstance(tc, str):
        tc = json.loads(tc)
    return {'priceFirstKm': float(r['price_first_km']), 'pricePerKm': float(r['price_per_km']),
            'pricePerHour': float(r['price_per_hour']), 'priceDelivery': float(r['price_delivery']),
            'priceWaitingPerMin': float(r['price_waiting_per_min']), 'autoAssignRadiusKm': float(r['auto_assign_radius_km']),
            'freeOrderTimeoutMs': int(r['free_order_timeout_ms']), 'globalDiscount': float(r['global_discount']),
            'kmDiscountThreshold': float(r['km_discount_threshold']), 'kmDiscount': float(r['km_discount']),
            'autoAssignMode': r['auto_assign_mode'], 'timeCoefficients': tc, 'adminPassword': r['admin_password']}


def fmt_driver(r):
    ss = r.get('subscription_start')
    return {'id': r['id'], 'name': r['name'], 'phone': r['phone'], 'car': r['car_display'],
            'carInfo': {'brand': r['car_brand'], 'model': r['car_model'], 'plateNumber': r['car_plate']},
            'rating': float(r['rating']), 'status': r['status'], 'autoAssign': r['auto_assign'],
            'distanceKm': float(r['distance_km']), 'tripsCount': int(r['trips_count']),
            'tripsLast24h': int(r['trips_last_24h']), 'priority': int(r['priority']),
            'login': r['login'], 'password': r['password'], 'hasAds': r['has_ads'],
            'subscriptionDays': int(r['subscription_days']),
            'subscriptionStart': int(ss.timestamp() * 1000) if ss else None,
            'freeWork': r['free_work'], 'registeredAt': str(r['created_at'])[:10],
            'autoAssignDeclines': int(r['auto_assign_declines']), 'cancelledOrders': int(r['cancelled_orders']),
            'autoAssignTrips': int(r['auto_assign_trips']), 'freeTrips': int(r['free_trips']),
            'totalEarnings': float(r['total_earnings']), 'totalKm': float(r['total_km']),
            'totalHours': float(r['total_hours'])}


def fmt_order(r):
    fa = r.get('free_at')
    ca = r.get('created_at')
    return {'id': r['id'], 'passengerId': r['passenger_id'], 'passengerName': r['passenger_name'],
            'passengerPhone': r.get('passenger_phone', ''), 'from': r['from_address'], 'to': r['to_address'],
            'tariff': r['tariff'],
            'options': {'children': r['children'], 'childrenCount': int(r['children_count']), 'luggage': r['luggage'],
                        'comment': r.get('comment', ''), 'deliveryDescription': r.get('delivery_description'),
                        'cargoDescription': r.get('cargo_description')},
            'status': r['status'], 'paymentMethod': r['payment_method'],
            'tips': float(r['tips']), 'discount': float(r['discount']), 'distanceKm': float(r['distance_km']),
            'price': float(r['price']) if r['price'] else 0,
            'driverId': r.get('driver_id'), 'driverName': r.get('driver_name'), 'driverCar': r.get('driver_car'),
            'etaMinutes': r.get('eta_minutes'), 'freeAt': int(fa.timestamp() * 1000) if fa else None,
            'acceptedVia': r.get('accepted_via'), 'cancelledBy': r.get('cancelled_by'),
            'scheduledAt': r.get('scheduled_at'), 'waitingMinutes': int(r.get('waiting_minutes', 0)),
            'createdAt': str(ca)[11:16] if ca else '', 'createdTimestamp': int(ca.timestamp() * 1000) if ca else 0}


def fmt_sup(r):
    return {'id': r['id'], 'fromId': r['from_id'], 'fromName': r['from_name'], 'fromRole': r['from_role'],
            'text': r['text'], 'time': r['time'], 'timestamp': int(r['msg_timestamp']), 'read': r['read']}