/* SPDX-License-Identifier: Apache-2.0 */

import { Object, Property } from 'fabric-contract-api'

@Object()
export class Cache {
  @Property()
  public ID!: string

  @Property()
  public Name!: string

  @Property()
  public Description!: string

  @Property()
  public GPSX!: number

  @Property()
  public GPSY!: number

  @Property()
  public Report!: string

  @Property()
  public Pass!: string

  @Property()
  public Maintainer!: string
}
