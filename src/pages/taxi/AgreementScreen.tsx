import Icon from "@/components/ui/icon";

interface Props {
  onClose: () => void;
}

export default function AgreementScreen({ onClose }: Props) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--taxi-dark)" }}>
      <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--taxi-border)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--taxi-yellow)" }}>
          <Icon name="ArrowLeft" size={20} />
        </button>
        <div style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 16, color: "#F0F2F5" }}>Пользовательское соглашение</div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px", lineHeight: 1.7 }}>
        <h2 style={{ fontFamily: "Montserrat", fontWeight: 800, fontSize: 18, color: "#F0F2F5", marginBottom: 12 }}>
          Условия использования сервиса Taxi
        </h2>
        <p style={{ fontSize: 13, color: "var(--taxi-muted)", marginBottom: 16 }}>Дата вступления в силу: 1 марта 2026 г.</p>

        <Section title="1. Общие положения">
          Настоящее Соглашение регулирует отношения между пользователем и сервисом Taxi. Используя приложение, вы подтверждаете согласие с условиями данного документа. Сервис предоставляет платформу для связи пассажиров и водителей такси.
        </Section>

        <Section title="2. Защита данных">
          Все персональные данные пользователей защищены с использованием современных методов шифрования. Мы применяем End-to-end шифрование для всех сообщений в чатах. Данные о поездках, платежах и личная информация хранятся в зашифрованном виде и не передаются третьим лицам без вашего явного согласия.
        </Section>

        <Section title="3. Конфиденциальность">
          Мы не продаём, не передаём и не раскрываем персональные данные пользователей третьим лицам. Информация используется исключительно для обеспечения работы сервиса: обработки заказов, связи с водителями и улучшения качества обслуживания. Геолокационные данные используются только во время активного заказа.
        </Section>

        <Section title="4. Обязанности пассажира">
          Пассажир обязуется предоставлять достоверную информацию при регистрации, своевременно оплачивать поездки выбранным способом, бережно относиться к транспортному средству водителя и соблюдать правила поведения в общественном транспорте.
        </Section>

        <Section title="5. Обязанности водителя">
          Водитель обязуется иметь действующее водительское удостоверение, поддерживать транспортное средство в исправном состоянии, соблюдать правила дорожного движения, выполнять принятые заказы добросовестно и корректно обращаться с пассажирами.
        </Section>

        <Section title="6. Оплата и тарифы">
          Стоимость поездки рассчитывается на основе расстояния маршрута, действующего тарифа и возможных коэффициентов. Оплата может производиться наличными или безналичным переводом. Чаевые являются добровольными и полностью передаются водителю.
        </Section>

        <Section title="7. Отмена заказа">
          Пассажир может отменить заказ до момента отметки водителя «На месте» без штрафных санкций. Частые необоснованные отмены могут повлиять на приоритет обслуживания.
        </Section>

        <Section title="8. Ответственность">
          Сервис Taxi является информационной платформой и не несёт ответственности за действия водителей и пассажиров. Все споры решаются через службу поддержки. Мы стремимся обеспечить максимально безопасный и качественный сервис.
        </Section>

        <Section title="9. Изменения соглашения">
          Мы оставляем за собой право вносить изменения в настоящее Соглашение. Уведомление об изменениях направляется через приложение. Продолжая использование сервиса после внесения изменений, вы подтверждаете своё согласие с обновлёнными условиями.
        </Section>

        <div style={{ padding: "16px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 14, marginTop: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Icon name="ShieldCheck" size={18} color="var(--taxi-green)" fallback="Shield" />
            <span style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "var(--taxi-green)" }}>Ваши данные защищены</span>
          </div>
          <p style={{ fontSize: 13, color: "var(--taxi-muted)", lineHeight: 1.6 }}>
            Все данные зашифрованы и не передаются третьим лицам. Мы используем современные стандарты безопасности для защиты вашей информации.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h3 style={{ fontFamily: "Montserrat", fontWeight: 700, fontSize: 14, color: "var(--taxi-yellow)", marginBottom: 6 }}>{title}</h3>
      <p style={{ fontSize: 13, color: "#c0c4cc" }}>{children}</p>
    </div>
  );
}