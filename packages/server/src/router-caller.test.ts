import { z } from 'zod'
import { createRouterCaller, os } from '.'
import { LAZY_PROCEDURE_SYMBOL } from './procedure-lazy'

describe('createRouterCaller', () => {
  const internal = false
  const context = { auth: true }

  const osw = os.context<{ auth?: boolean }>()

  const ping = osw
    .input(z.object({ value: z.string().transform(v => Number(v)) }))
    .output(z.object({ value: z.number().transform(v => v.toString()) }))
    .func((input, context, meta) => {
      expect(context).toEqual(context)

      return input
    })

  const pong = osw.func((_, context, meta) => {
    expect(context).toEqual(context)

    return { value: true }
  })

  const router = osw.router({
    ping,
    pong,
    nested: {
      ping,
      pong,
    },
    lazy: osw.lazy(async () => ({
      default: {
        ping,
        pong: osw.lazy(async () => ({ default: pong })),
      },
    })),
  })

  it('test', async () => {
    const caller = osw.lazy(() => Promise.resolve({
      default: {
        pong: osw.lazy(() => Promise.resolve({ default: pong })),
      },
    }))

    // console.log(await caller.lazy.ping({ value: '123' }))
    console.log(await caller.pong())
  })

  it('infer context', () => {
    createRouterCaller({
      router,
      // @ts-expect-error invalid context
      context: { auth: 123 },
    })

    createRouterCaller({
      router,
      context,
    })
  })

  it('with validate', () => {
    const caller = createRouterCaller({
      router,
      context,
    })

    expectTypeOf(caller.ping).toMatchTypeOf<
      (input: { value: string }) => Promise<{
        value: string
      }>
    >()

    expectTypeOf(caller.pong).toMatchTypeOf<
      (input: unknown) => Promise<{
        value: boolean
      }>
    >()

    expectTypeOf(caller.nested.ping).toMatchTypeOf<
      (input: { value: string }) => Promise<{
        value: string
      }>
    >()

    expectTypeOf(caller.nested.pong).toMatchTypeOf<
      (input: unknown) => Promise<{
        value: boolean
      }>
    >()

    expect(caller.ping({ value: '123' })).resolves.toEqual({ value: '123' })
    expect(caller.pong({ value: '123' })).resolves.toEqual({ value: true })

    expect(caller.nested.ping({ value: '123' })).resolves.toEqual({
      value: '123',
    })
    expect(caller.nested.pong({ value: '123' })).resolves.toEqual({
      value: true,
    })

    expect(caller.lazy.ping({ value: '123' })).resolves.toEqual({
      value: '123',
    })

    expect(caller.lazy.pong({ value: '123' })).resolves.toEqual({
      value: true,
    })

    // @ts-expect-error - invalid input
    expect(caller.ping({ value: new Date('2023-01-01') })).rejects.toThrowError(
      'Validation input failed',
    )

    // @ts-expect-error - invalid input
    expect(caller.nested.ping({ value: true })).rejects.toThrowError(
      'Validation input failed',
    )
  })

  it('path', () => {
    const ping = osw.func((_, __, { path }) => {
      return path
    })

    const router = osw.router({
      ping,
      nested: {
        ping,
        child: {
          ping,
        },
      },
      lazy: osw.lazy(() => Promise.resolve({
        default: {
          ping,
          nested: {
            ping: osw.lazy(() => Promise.resolve({ default: ping })),
          },
        },
      })),
    })

    const caller = createRouterCaller({
      router,
      context,
    })

    expect(caller.ping('')).resolves.toEqual(['ping'])
    expect(caller.nested.ping('')).resolves.toEqual(['nested', 'ping'])
    expect(caller.nested.child.ping('')).resolves.toEqual([
      'nested',
      'child',
      'ping',
    ])

    expect(caller.lazy.ping('')).resolves.toEqual(['lazy', 'ping'])
    expect(caller.lazy.nested.ping('')).resolves.toEqual(['lazy', 'nested', 'ping'])
    expect(caller.lazy.nested.ping('')).resolves.toEqual([
      'lazy',
      'nested',
      'ping',
    ])
  })
})
