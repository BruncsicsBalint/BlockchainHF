import { Object, Property } from 'fabric-contract-api'

@Object()
export class Trackable {
  @Property()
  public ID!: string

  @Property()
  public Name!: string

  @Property()
  public Inserted!: boolean

  @Property()
  public VisitLog!: string
}