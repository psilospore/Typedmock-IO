/* eslint-disable */
// @ts-ignore

import { pipe } from 'fp-ts/lib/pipeable'
import * as t from 'io-ts'
import { EitherT, left, right } from 'fp-ts/lib/EitherT'
import {State, execState, evalState} from 'fp-ts/lib/State'
import faker from "faker"
import { Option, some, none, fold } from 'fp-ts/lib/Option'

const string = new t.Type<string, string, unknown>(
  'string',
  (input: unknown): input is string => typeof input === 'string',
  // `t.success` and `t.failure` are helpers used to build `Either` instances
  (input, context) =>
    typeof input === 'string' ? t.success(input) : t.failure(input, context),
  // `A` and `O` are the same, so `encode` is just the identity function
  t.identity,
)

/**
 * TODO Intermock seems to have a way to detect the type name and choose an appropriate faker function
 * For now just statically check
 */
const genStr = (maybeProp: Option<string>) => {
  const defaultStr = () => faker.lorem.word()
  return pipe(
    maybeProp,
    fold(
      defaultStr,
      (prop) => {
        if (prop.indexOf("email") === 0) {
          return faker.internet.email()
        } else {
          return defaultStr()
        }
      }
    )
  )
}

type GenState = {
  propName: Option<string> //The name of the key. For a T.InterfaceType it needs to pass down the key of the child.
}

const EmptyGenState: GenState = {
  propName: none
}

const initialState = EmptyGenState

/**
 * Generates mock data from a io-ts codec using Faker.
 * Detect property name and generate some sensical mock data.
 * 
 * genFromCodec(io.type({
 *   name: io.string,
 *   email: io.string
 * }))
 * 
 * {
 *   "name": "Rerence McKenna",
 *   "email": "greengoblins@yahoo.com"
 * }
 * 
 * TODO use EitherT
 * TODO use NonEmptyList<Error> with Error Accumulation vs short circuiting
 * @param codec Codec to generate from
 */
function genFromCodec<A>(codec: t.Type<A>): State<GenState, A> {
    return ({propName}: GenState): [A, GenState] => {
      if (codec instanceof t.StringType) { //Where StringType extends Type<string> so A is string
        return [(genStr(propName) as unknown as A), EmptyGenState]
      } else if (codec instanceof t.InterfaceType) {
          const keyValueArr: Readonly<Record<string, any>>[] = Object
            .entries((codec as t.InterfaceType<t.Props>).props)
            .map(
            ([propName, propCodec]) => ({
              [propName]: evalState(genFromCodec(propCodec), {
                propName: some(propName)
              })
            }))
  
            const record = M.fold(structMonoid)(keyValueArr)
            return [(record as unknown as A), EmptyGenState]
      } else {
         //left(new Error("TODO ${codec.name} not yet supported")) //TODO EitherT
         return [null as unknown as A, EmptyGenState]
      }
    }
  }
  

t.type({email: t.string})
const s = evalState(genFromCodec(), initialState)
