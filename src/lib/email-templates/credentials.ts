export function generateCredentialsEmail(login: string, password: string, name: string): string {
  return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Добро пожаловать в ProtekAuto</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Onest', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);">
    <table role="presentation" style="width: 100%; border-collapse: collapse; padding: 60px 20px;">
        <tr>
            <td align="center">
                <table role="presentation" style="width: 560px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);">

                    <!-- Header with gradient -->
                    <tr>
                        <td style="padding: 0;">
                            <table role="presentation" style="width: 100%; border-collapse: collapse; background: linear-gradient(135deg, #EC1C24 0%, #c41519 100%);">
                                <tr>
                                    <td style="padding: 50px 40px; text-align: center;">
                                        <h1 style="margin: 0 0 12px 0; color: #ffffff; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">
                                            ProtekAuto
                                        </h1>
                                        <p style="margin: 0; color: rgba(255, 255, 255, 0.95); font-size: 18px; font-weight: 500;">
                                            Добро пожаловать!
                                        </p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 48px 40px;">

                            <p style="margin: 0 0 16px 0; color: #000814; font-size: 18px; font-weight: 700; line-height: 1.4;">
                                Здравствуйте, ${name}!
                            </p>

                            <p style="margin: 0 0 32px 0; color: #424F60; font-size: 15px; font-weight: 500; line-height: 1.6;">
                                Регистрация завершена. Мы создали для вас логин и пароль для входа в систему.
                            </p>

                            <!-- Credentials Card -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; background: #F5F8FB; border-radius: 12px; margin: 0 0 28px 0; overflow: hidden;">
                                <tr>
                                    <td style="padding: 32px 28px;">

                                        <!-- Login -->
                                        <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                                            <tr>
                                                <td>
                                                    <p style="margin: 0 0 10px 0; color: #8893A2; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">
                                                        Логин
                                                    </p>
                                                    <div style="padding: 16px 20px; background-color: #ffffff; border-radius: 8px; border: 2px solid #E1E7EE;">
                                                        <p style="margin: 0; color: #000814; font-size: 20px; font-weight: 700; font-family: 'SF Mono', 'Monaco', 'Courier New', monospace; letter-spacing: 0.3px;">
                                                            ${login}
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>

                                        <!-- Password -->
                                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                                            <tr>
                                                <td>
                                                    <p style="margin: 0 0 10px 0; color: #8893A2; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px;">
                                                        Пароль
                                                    </p>
                                                    <div style="padding: 16px 20px; background-color: #ffffff; border-radius: 8px; border: 2px solid #E1E7EE;">
                                                        <p style="margin: 0; color: #000814; font-size: 20px; font-weight: 700; font-family: 'SF Mono', 'Monaco', 'Courier New', monospace; letter-spacing: 0.3px;">
                                                            ${password}
                                                        </p>
                                                    </div>
                                                </td>
                                            </tr>
                                        </table>

                                    </td>
                                </tr>
                            </table>

                            <!-- Button -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 0 0 32px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="https://protekauto.ru" style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #EC1C24 0%, #c41519 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 700; text-align: center; box-shadow: 0 4px 12px rgba(236, 28, 36, 0.3);">
                                            Войти в личный кабинет
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <!-- Info Box -->
                            <table role="presentation" style="width: 100%; border-collapse: collapse; background: #FFF9E6; border-radius: 10px; border-left: 4px solid #FFB800; margin: 0 0 32px 0;">
                                <tr>
                                    <td style="padding: 18px 20px;">
                                        <p style="margin: 0; color: #6B5A00; font-size: 14px; font-weight: 500; line-height: 1.5;">
                                            <strong style="font-weight: 700;">💡 Важно:</strong> Сохраните данные в надежном месте. Вы можете изменить их в настройках аккаунта.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="margin: 0; color: #8893A2; font-size: 14px; font-weight: 500; line-height: 1.6; text-align: center;">
                                Если возникнут вопросы — мы всегда на связи!
                            </p>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 32px 40px; background-color: #F5F8FB; border-top: 1px solid #E1E7EE;">
                            <p style="margin: 0 0 8px 0; color: #8893A2; font-size: 13px; font-weight: 600; text-align: center;">
                                Команда ProtekAuto
                            </p>
                            <p style="margin: 0; color: #B0B8C4; font-size: 12px; font-weight: 500; text-align: center;">
                                © 2025 ProtekAuto. Все права защищены.
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
}
