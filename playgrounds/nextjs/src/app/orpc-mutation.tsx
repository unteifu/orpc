'use client'

import { orpc } from '@/lib/orpc'

export function CreatePlanetMutationForm() {
  const utils = orpc.useUtils()

  const { mutate } = orpc.planet.create.useMutation({
    onSuccess() {
      utils.planet.invalidate()
    },
    onError(error) {
      alert(error.message)
    },
  })

  return (
    <div>
      <h2>oRPC and Tanstack Query | Create Planet example</h2>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const form = new FormData(e.target as HTMLFormElement)

          const name = form.get('name') as string
          const description
          = (form.get('description') as string | null) ?? undefined
          const image = form.get('image') as File

          mutate({
            name,
            description,
            image: image.size > 0 ? image : undefined,
          })
        }}
      >
        <label>
          Name
          <input type="text" name="name" required />
        </label>
        <label>
          Description
          <textarea name="description" />
        </label>
        <label>
          Image
          <input type="file" name="image" accept="image/*" />
        </label>
        <button type="submit">Submit</button>
      </form>
    </div>

  )
}