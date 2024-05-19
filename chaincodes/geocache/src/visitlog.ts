import { Object, Property } from 'fabric-contract-api'

@Object()
export class VisitLog {
  @Property()
  public ID!: string

  @Property()
  public Trackables?: string[]

  @Property()
  public User!: string

  @Property()
  public Cache!: string

  @Property()
  public Time!: string
}
