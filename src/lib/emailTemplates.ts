export function getInvoiceEmailTemplate(orderNumber: string, totalAmount: number, clientName?: string): { html: string; text: string } {
  const formattedAmount = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB'
  }).format(totalAmount)

  const html = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Счёт на оплату заказа №${orderNumber}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

          <!-- Header with logo and brand color -->
          <tr>
            <td style="background-color: #EC1C24; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">ПРОТЕК</h1>
              <p style="margin: 8px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">Автозапчасти и комплектующие</p>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="padding: 40px 30px;">
              ${clientName ? `<p style="margin: 0 0 20px 0; font-size: 16px; color: #333333;">Здравствуйте, ${clientName}!</p>` : ''}

              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.5;">
                Благодарим вас за заказ! Ваш заказ <strong>№${orderNumber}</strong> успешно создан.
              </p>

              <p style="margin: 0 0 30px 0; font-size: 16px; color: #333333; line-height: 1.5;">
                Во вложении к письму находится счёт на оплату на сумму <strong style="color: #EC1C24;">${formattedAmount}</strong>.
              </p>

              <!-- Order details box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f8f8; border-radius: 6px; margin-bottom: 30px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #666666;">Номер заказа:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #333333; font-weight: 600; text-align: right;">№${orderNumber}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #666666;">Сумма к оплате:</td>
                        <td style="padding: 8px 0; font-size: 16px; color: #EC1C24; font-weight: 600; text-align: right;">${formattedAmount}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-size: 14px; color: #666666;">Способ оплаты:</td>
                        <td style="padding: 8px 0; font-size: 14px; color: #333333; text-align: right;">По счёту</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 20px 0; font-size: 16px; color: #333333; line-height: 1.5;">
                После поступления оплаты мы приступим к обработке вашего заказа.
              </p>

              <p style="margin: 0 0 30px 0; font-size: 14px; color: #666666; line-height: 1.5;">
                Если у вас возникли вопросы, свяжитесь с нами по телефону <a href="tel:+74952602060" style="color: #EC1C24; text-decoration: none;">+7 (495) 260-20-60</a> или ответьте на это письмо.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <a href="${process.env.FRONTEND_ORIGIN || 'https://protekauto.ru'}/profile/orders"
                       style="display: inline-block; padding: 14px 32px; background-color: #EC1C24; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      Отследить заказ
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f8f8f8; border-radius: 0 0 8px 8px; border-top: 1px solid #eeeeee;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #333333; font-weight: 600; text-align: center;">
                ООО «ПРОТЕК»
              </p>
              <p style="margin: 0 0 5px 0; font-size: 12px; color: #666666; text-align: center;">
                ИНН: 5007117840 | КПП: 500701001
              </p>
              <p style="margin: 0 0 5px 0; font-size: 12px; color: #666666; text-align: center;">
                Телефон: <a href="tel:+74952602060" style="color: #EC1C24; text-decoration: none;">+7 (495) 260-20-60</a>
              </p>
              <p style="margin: 0; font-size: 12px; color: #666666; text-align: center;">
                Email: <a href="mailto:noreply@protekauto.ru" style="color: #EC1C24; text-decoration: none;">noreply@protekauto.ru</a>
              </p>
            </td>
          </tr>

        </table>

        <!-- Legal notice -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 20px auto 0;">
          <tr>
            <td style="padding: 0 20px; text-align: center;">
              <p style="margin: 0; font-size: 11px; color: #999999; line-height: 1.5;">
                Это автоматическое письмо. Пожалуйста, не отвечайте на него.<br>
                По всем вопросам обращайтесь по телефону <a href="tel:+74952602060" style="color: #EC1C24; text-decoration: none;">+7 (495) 260-20-60</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const text = `
Заказ №${orderNumber} - Счёт на оплату

${clientName ? `Здравствуйте, ${clientName}!` : ''}

Благодарим вас за заказ! Ваш заказ №${orderNumber} успешно создан.

Во вложении к письму находится счёт на оплату на сумму ${formattedAmount}.

Номер заказа: №${orderNumber}
Сумма к оплате: ${formattedAmount}
Способ оплаты: По счёту

После поступления оплаты мы приступим к обработке вашего заказа.

Если у вас возникли вопросы, свяжитесь с нами:
Телефон: +7 (495) 260-20-60
Email: noreply@protekauto.ru

---
ООО «ПРОТЕК»
ИНН: 5007117840 | КПП: 500701001
  `.trim()

  return { html, text }
}
