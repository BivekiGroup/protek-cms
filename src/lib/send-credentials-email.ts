import { sendEmail } from './email'
import { generateCredentialsEmail } from './email-templates/credentials'

export async function sendCredentialsEmail(
  email: string,
  login: string,
  password: string,
  name: string
): Promise<void> {
  const html = generateCredentialsEmail(login, password, name)

  await sendEmail({
    to: email,
    subject: 'Ваши данные для входа - ProtekAuto',
    html,
    text: `Здравствуйте, ${name}!\n\nВаши данные для входа в ProtekAuto:\n\nЛогин: ${login}\nПароль: ${password}\n\nСохраните эти данные в надежном месте.\nВы можете изменить логин и пароль в настройках аккаунта.\n\nС уважением,\nКоманда ProtekAuto`
  })
}
