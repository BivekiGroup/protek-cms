import { streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import 'dotenv/config'

async function main() {
  const modelName = process.env.OPENAI_MODEL || 'gpt-4o'
  const result = streamText({
    model: openai(modelName),
    prompt: 'Invent a new holiday and describe its traditions.',
  })

  for await (const textPart of result.textStream) {
    process.stdout.write(textPart)
  }

  console.log()
  console.log('Token usage:', await result.usage)
  console.log('Finish reason:', await result.finishReason)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

