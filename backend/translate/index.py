import json
import urllib.request
import urllib.parse

def handler(event: dict, context) -> dict:
    """Прокси для перевода текста с японского на русский через Google Translate."""

    if event.get('httpMethod') == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400',
            },
            'body': ''
        }

    body = json.loads(event.get('body') or '{}')
    text = body.get('text', '').strip()

    if not text:
        return {
            'statusCode': 400,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'text is required'})
        }

    params = urllib.parse.urlencode({
        'client': 'gtx',
        'sl': 'ja',
        'tl': 'ru',
        'dt': 't',
        'q': text,
    })
    url = f'https://translate.googleapis.com/translate_a/single?{params}'

    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=10) as resp:
        data = json.loads(resp.read().decode('utf-8'))

    translated = ''.join(part[0] for part in data[0] if part[0])

    return {
        'statusCode': 200,
        'headers': {'Access-Control-Allow-Origin': '*'},
        'body': json.dumps({'translated': translated})
    }
