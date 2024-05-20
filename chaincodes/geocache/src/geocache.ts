/* SPDX-License-Identifier: Apache-2.0 */

import { Context, Contract, Info, Param, Returns, Transaction } from 'fabric-contract-api'
import stringify from 'json-stringify-deterministic'
import sortKeys from 'sort-keys-recursive'

import { Cache } from './cache'
import { VisitLog } from './visitlog'
import { Trackable } from './trackable'

@Info({ title: 'Geocache', description: 'Geocache chaincode' })
export class Geocache extends Contract {
  constructor () {
    super('Geocache')
  }

  //
  //--------------------- Maintainer ---------------------
  //

  @Transaction()
  @Returns('Cache')
  async UpdateCache (ctx: Context, CacheID: string, Name: string, Description: string, GPSX: number, GPSY: number, Pass: string, Report: string): Promise<Cache> {
    await this.assertCacheExists(ctx, CacheID)

    const Maintainer = this.deserializeCache(await ctx.stub.getState(this.makeCacheID(CacheID))).Maintainer

    this.assertMaintainer(ctx, Maintainer)

    const cache: Cache = { ID: CacheID, Name, Description, GPSX, GPSY, Report, Pass, Maintainer }
    await ctx.stub.putState(this.makeCacheID(CacheID), this.serializeCache(cache))

    return cache
  }

  @Transaction()
  @Returns('string')
  async DeleteCache (ctx: Context, CacheID: string): Promise<string> {
    await this.assertCacheExists(ctx, CacheID)

    const Maintainer = this.deserializeCache(await ctx.stub.getState(this.makeCacheID(CacheID))).Maintainer

    this.assertMaintainer(ctx, Maintainer)

    await ctx.stub.deleteState(this.makeCacheID(CacheID))

    return CacheID
  }

  @Transaction(false)
  @Returns('string')
  async GetCachePass (ctx: Context, CacheID: string): Promise<string> {
    await this.assertCacheExists(ctx, CacheID)

    const Maintainer = this.deserializeCache(await ctx.stub.getState(this.makeCacheID(CacheID))).Maintainer

    this.assertMaintainer(ctx, Maintainer)

    return this.deserializeCache(await ctx.stub.getState(this.makeCacheID(CacheID))).Pass
  }

  //
  //--------------------- Public ---------------------
  //

  // ------------- Cache -------------
  @Transaction()
  @Returns('Cache')
  async CreateCache (ctx: Context, CacheID: string, Name: string, Description: string, GPSX: number, GPSY: number, Pass: string): Promise<Cache> {
    await this.assertCacheNotExists(ctx, CacheID)
    const Maintainer: string = this.getUserID(ctx)
    const cache: Cache = { ID: CacheID, Name, Description, GPSX, GPSY, Report:"", Pass, Maintainer }
    await ctx.stub.putState(this.makeCacheID(CacheID), this.serializeCache(cache))

    return cache
  }

  @Transaction(false)
  @Returns('Cache')
  @Param('ID', 'string')
  async GetCache (ctx: Context, CacheID: string): Promise<Cache> {
    await this.assertCacheExists(ctx, CacheID)

    return this.hideHiddenValues(ctx, this.deserializeCache(await ctx.stub.getState(this.makeCacheID(CacheID))))
  }

  @Transaction(false)
  @Returns('string')
  async GetAllCaches (ctx: Context): Promise<Cache[]> {
    const results: Cache[] = []

    const iterator = await ctx.stub.getStateByRange('CACHE-', 'CACHE-~')
    let result = await iterator.next()
    while (!result.done) {
      results.push(this.hideHiddenValues(ctx, this.deserializeCache(result.value.value)))
      result = await iterator.next()
    }

    return results
  }

  @Transaction(false)
  @Returns('boolean')
  async CacheExists (ctx: Context, CacheID: string): Promise<boolean> {
    const data: Uint8Array = await ctx.stub.getState(this.makeCacheID(CacheID))
    return data !== undefined && data.length > 0
  }

  @Transaction()
  @Returns('Cache')
  @Param('ID', 'string')
  async ReportCache (ctx: Context, CacheID: string, Report: string): Promise<Cache> {
    await this.assertCacheExists(ctx, CacheID)

    const oldCache: Cache = this.deserializeCache(await ctx.stub.getState(this.makeCacheID(CacheID)))

    const newcache: Cache = { ID: CacheID, Name: oldCache.Name, Description: oldCache.Description, GPSX: oldCache.GPSX, GPSY: oldCache.GPSY, Report, Pass: oldCache.Pass, Maintainer: oldCache.Maintainer }
    await ctx.stub.putState(this.makeCacheID(CacheID), this.serializeCache(newcache))

    return this.hideHiddenValues(ctx, newcache)
  }

  // ------------- Logs -------------

  @Transaction()
  async CreateLog (ctx: Context, LogID: string, CacheID: string, Pass: string): Promise<VisitLog> {
    await this.assertCacheExists(ctx, CacheID)
    await this.assertLogNotExists(ctx, LogID)

    const cache: Cache = this.deserializeCache(await ctx.stub.getState(this.makeCacheID(CacheID)))

    if(Pass != cache.Pass)
      throw new Error(`Wrong Pass!`) 

    const visitLog: VisitLog = {ID: LogID, Trackables: [], User: this.getUserID(ctx), Cache: CacheID, Time: new Date().toISOString()}

    await ctx.stub.putState(this.makeLogID(LogID), this.serializeLog(visitLog))

    return visitLog
  }

  @Transaction(false)
  @Returns('VisitLog')
  @Param('ID', 'string')
  async GetLog (ctx: Context, ID: string): Promise<VisitLog> {
    await this.assertLogExists(ctx, ID)

    return this.deserializeLog(await ctx.stub.getState(ID))
  }

  @Transaction(false)
  @Returns('string')
  async GetAllLogs (ctx: Context): Promise<VisitLog[]> {
    const results: VisitLog[] = []

    const iterator = await ctx.stub.getStateByRange('LOG-', 'LOG-~')
    let result = await iterator.next()
    while (!result.done) {
      results.push(this.deserializeLog(result.value.value))
      result = await iterator.next()
    }

    return results
  }

  @Transaction(false)
  @Returns('boolean')
  async LogExists (ctx: Context, LogID: string): Promise<boolean> {
    const data: Uint8Array = await ctx.stub.getState(this.makeLogID(LogID))
    return data !== undefined && data.length > 0
  }

  // ------------- Trackables -------------

  @Transaction()
  async CreateTrackable (ctx: Context, TrackableID: string, LogID: string, Name: string): Promise<Trackable> {
    await this.assertLogExists(ctx, LogID)
    await this.assertTrackableNotExists(ctx, TrackableID)

    const newVisitLog: VisitLog = this.deserializeLog(await ctx.stub.getState(this.makeLogID(LogID)))

    if(this.getUserID(ctx) != newVisitLog.User)
      throw new Error(`Visitlog ${LogID} is not made by ${this.getUserID(ctx)}`)
    
    const trackable: Trackable = { ID: TrackableID, Name, Inserted: true, VisitLog: LogID }
    const newVisitLogEdited: VisitLog = {ID: newVisitLog.ID, Trackables: [...(newVisitLog.Trackables || []), `${TrackableID}-IN`], User: newVisitLog.User, Cache: newVisitLog.Cache, Time: newVisitLog.Time}

    await ctx.stub.putState(this.makeTrackableID(TrackableID), this.serializeTrackable(trackable))
    await ctx.stub.putState(this.makeLogID(newVisitLog.ID), this.serializeLog(newVisitLogEdited))

    return trackable
  }

  /*
  Scenatios
  
  User A wants to insert trackable but new log does not exist
  User A wants to insert trackable but the trackable does not exist

  User A wants to insert trackable but the trackable is already inserted
  
  User A wants to insert trackable but does not own the new log

  User A wants to insert trackable but the the new log is before the old log

  User A wants to insert trackable but does not own the trackable
  */

  @Transaction()
  async InsertTrackable (ctx: Context, TrackableID: string, LogID: string): Promise<Trackable> {
    await this.assertLogExists(ctx, LogID)
    await this.assertTrackableExists(ctx, TrackableID)

    const trackable: Trackable = this.deserializeTrackable(await ctx.stub.getState(this.makeTrackableID(TrackableID)))

    if(trackable.Inserted == true)
      throw new Error(`Trackable ${TrackableID} is already inserted`)

    const oldVisitLog: VisitLog = this.deserializeLog(await ctx.stub.getState(this.makeLogID(trackable.VisitLog)))
    const newVisitLog: VisitLog = this.deserializeLog(await ctx.stub.getState(this.makeLogID(LogID)))

    if((oldVisitLog.User != newVisitLog.User))
      throw new Error(`Trackable ${TrackableID} is not owned by ${newVisitLog.User}`)

    if(this.getUserID(ctx) != newVisitLog.User)
      throw new Error(`Visitlog ${LogID} is not made by ${this.getUserID(ctx)}`)

    if(newVisitLog.Time <= oldVisitLog.Time)
      throw new Error(`Visitlog ${LogID} is before ${trackable.VisitLog}`)

    const newTrackable: Trackable = { ID: TrackableID, Name: trackable.Name, Inserted: true, VisitLog: LogID }
    const newVisitLogEdited: VisitLog = {ID: newVisitLog.ID, Trackables: [...(newVisitLog.Trackables || []), `${TrackableID}-IN`], User: newVisitLog.User, Cache: newVisitLog.Cache, Time: newVisitLog.Time}

    await ctx.stub.putState(this.makeTrackableID(TrackableID), this.serializeTrackable(newTrackable))
    await ctx.stub.putState(this.makeLogID(newVisitLog.ID), this.serializeLog(newVisitLogEdited))

    return newTrackable
  }

  /*
  Scenatios
  
  User A wants to remove trackable but new log does not exist
  User A wants to remove trackable but the trackable does not exist

  User A wants to remove trackable but the trackable is not inserted
  
  User A wants to remove trackable but does not own the new log

  User A wants to insert trackable but the the new log is before the old log

  User A wants to remove trackable but the trackable and the new log is for different caches
  */
  @Transaction()
  async RemoveTrackable (ctx: Context, TrackableID: string, LogID: string): Promise<Trackable> {
    await this.assertLogExists(ctx, LogID)
    await this.assertTrackableExists(ctx, TrackableID)

    const trackable: Trackable = this.deserializeTrackable(await ctx.stub.getState(this.makeTrackableID(TrackableID)))

    if(trackable.Inserted != true)
      throw new Error(`Trackable ${TrackableID} is not inserted`)

    const oldVisitLog: VisitLog = this.deserializeLog(await ctx.stub.getState(this.makeLogID(trackable.VisitLog)))
    const newVisitLog: VisitLog = this.deserializeLog(await ctx.stub.getState(this.makeLogID(LogID)))

    if(this.getUserID(ctx) != newVisitLog.User)
      throw new Error(`Visitlog ${LogID} is not made by ${this.getUserID(ctx)}`)

    if(newVisitLog.Time <= oldVisitLog.Time)
      throw new Error(`Visitlog ${LogID} is before ${trackable.VisitLog}`)

    if(newVisitLog.Cache != oldVisitLog.Cache)
      throw new Error(`Trackable ${TrackableID} and Visitlog ${LogID} is for different caches`)

    const newTrackable: Trackable = { ID: TrackableID, Name: trackable.Name, Inserted: false, VisitLog: LogID }
    const newVisitLogEdited: VisitLog = {ID: newVisitLog.ID, Trackables: [...(newVisitLog.Trackables || []), `${TrackableID}-OUT`], User: newVisitLog.User, Cache: newVisitLog.Cache, Time: newVisitLog.Time}

    await ctx.stub.putState(this.makeTrackableID(TrackableID), this.serializeTrackable(newTrackable))
    await ctx.stub.putState(this.makeLogID(newVisitLog.ID), this.serializeLog(newVisitLogEdited))

    return newTrackable
  }

  @Transaction(false)
  @Returns('Trackable')
  async GetTrackable (ctx: Context, TrackableID: string): Promise<Trackable> {
    await this.assertTrackableExists(ctx, TrackableID)

    return this.deserializeTrackable(await ctx.stub.getState(this.makeTrackableID(TrackableID)))
  }

  @Transaction(false)
  async GetAllTrackables (ctx: Context): Promise<Trackable[]> {
    const results: Trackable[] = []

    const iterator = await ctx.stub.getStateByRange('TRACKABLE-', 'TRACKABLE-~')
    let result = await iterator.next()
    while (!result.done) {
      results.push(this.deserializeTrackable(result.value.value))
      result = await iterator.next()
    }

    return results
  }


  @Transaction(false)
  @Returns('boolean')
  async TrackableExists (ctx: Context, TrackableID: string): Promise<boolean> {
    const data: Uint8Array = await ctx.stub.getState(this.makeTrackableID(TrackableID))
    return data !== undefined && data.length > 0
  }
  
  //
  //--------------------- Admin ---------------------
  //
  
  @Transaction()
  async InitLedger (ctx: Context): Promise<string> {
    await this.InitCaches(ctx)
    await this.InitLogs(ctx)
    await this.InitTrackables(ctx)

    return 'Ledger initialized'
  }
  
  //
  //--------------------- Dev ---------------------
  //

  @Transaction(false)
  async Whoami (ctx: Context): Promise<string> {
    return this.getUserID(ctx)
  }

  @Transaction(false)
  async Ping (): Promise<string> {
    return 'pong'
  }

  
  //
  //--------------------- Helper ---------------------
  //

  // Permission
  private assertMaintainer (ctx: Context, id: string): void {
    if (!(this.getUserID(ctx) == id)) {
      throw new Error(`Not maintainer`)
    }
  }

  private getUserID (ctx: Context): string {
    const user = ctx.clientIdentity.getID()
    //ctx.clientIdentity.assertAttributeValue('role', 'admin')
    //let regex = /\/CN=([^:]+):/;
    //let match = JSON.stringify(user).match(regex);
    const userid = JSON.stringify(user)
    if (userid != "" || userid != null) {
      //return JSON.stringify(match[1])
      return userid.slice(1, -1)
    } else {
      throw new Error(`User not found!`)
    }
  }

  private hideHiddenValues(ctx: Context, cache: Cache): Cache{
    let newCache: Cache = cache
    if(!this.isMaintainer(ctx, cache.Maintainer)){
      newCache.Pass = ""
    }
    return newCache
  }

  private isMaintainer(ctx: Context, id: string): boolean{
    return (this.getUserID(ctx) == id)
  }

  // Cache

  private async assertCacheNotExists (ctx: Context, CacheID: string): Promise<void> {
    if (await this.CacheExists(ctx, CacheID)) {
      throw new Error(`Cache ${CacheID} already exists`)
    }
  }

  private async assertCacheExists (ctx: Context, CacheID: string): Promise<void> {
    if (!(await this.CacheExists(ctx, CacheID))) {
      throw new Error(`Cache ${CacheID} does not exist`)
    }
  }

  private makeCacheID(id: string): string{
    return `CACHE-${id}`
  }

  private serializeCache (cache: Cache): Buffer {
    return Buffer.from(stringify(sortKeys(cache)))
  }

  private deserializeCache (data: Uint8Array): Cache {
    return JSON.parse(data.toString()) as Cache
  }

  // Logs
  private makeLogID(id: string): string{
    return `LOG-${id}`
  }

  private serializeLog (visitLog: VisitLog): Buffer {
    return Buffer.from(stringify(sortKeys(visitLog)))
  }

  private deserializeLog (data: Uint8Array): VisitLog {
    return JSON.parse(data.toString()) as VisitLog
  }

  private async assertLogNotExists (ctx: Context, id: string): Promise<void> {
    if ((await this.LogExists(ctx, id))) {
      throw new Error(`Log ${id} already exists`)
    }
  }

  private async assertLogExists (ctx: Context, id: string): Promise<void> {
    if (!(await this.LogExists(ctx, id))) {
      throw new Error(`Log ${id} does not exist`)
    }
  }

  // Trackables
  private makeTrackableID(id: string): string{
    return `TRACKABLE-${id}`
  }

  private serializeTrackable (trackable: Trackable): Buffer {
    return Buffer.from(stringify(sortKeys(trackable)))
  }

  private deserializeTrackable (data: Uint8Array): Trackable {
    return JSON.parse(data.toString()) as Trackable
  }

  private async assertTrackableNotExists (ctx: Context, id: string): Promise<void> {
    if ((await this.TrackableExists(ctx, id))) {
      throw new Error(`Trackable ${id} already exists`)
    }
  }

  private async assertTrackableExists (ctx: Context, id: string): Promise<void> {
    if (!(await this.TrackableExists(ctx, id))) {
      throw new Error(`Trackable ${id} does not exist`)
    }
  }

  // Inits
  async InitCaches (ctx: Context): Promise<void> {
    const caches: Cache[] = [
      {
        ID: 'cache1',
        Name: 'First Cache',
        Description: 'This is the first cache ever!',
        GPSX: 12,
        GPSY: 36,
        Report: "",
        Pass: "CachePass123",
        Maintainer: '\"admin\"'
      },
      {
        ID: 'cache2',
        Name: 'Second Cache',
        Description: 'This is the second cache ever!',
        GPSX: 69,
        GPSY: 420,
        Report: "",
        Pass: "asd123",
        Maintainer: 'Gaspacchio'
      },
      {
        ID: 'cache3',
        Name: 'Third Cache',
        Description: 'This is the third cache ever!',
        GPSX: 11,
        GPSY: 11,
        Report: "",
        Pass: "asd123",
        Maintainer: 'Snitzel'
      },
    ]

    for (const cache of caches) {
      await ctx.stub.putState(this.makeCacheID(cache.ID), this.serializeCache(cache))
      console.info(`Cache ${cache.ID} initialized`)
    }
  }

  async InitLogs (ctx: Context): Promise<void> {
    const logs: VisitLog[] = [
      {
        ID: 'log1',
        Trackables: ["trackable1-IN"],
        User: '\"admin\"',
        Cache: 'cache1',
        Time: new Date().toISOString()
      },
      {
        ID: 'log2',
        Trackables: ["trackable2-IN"],
        User: 'user2',
        Cache: 'cache2',
        Time: new Date().toISOString()
      },
      {
        ID: 'log3',
        Trackables: ["trackable3-IN"],
        User: 'user3',
        Cache: 'cache3',
        Time: new Date().toISOString()
      },
    ]

    for (const log of logs) {
      await ctx.stub.putState(this.makeLogID(log.ID), this.serializeLog(log))
      console.info(`Log ${log.ID} initialized`)
    }
  }

  async InitTrackables (ctx: Context): Promise<void> {
    const trackables: Trackable[] = [
      {
        ID: 'trackable1',
        Name: 'First Trackable',
        Inserted: true,
        VisitLog: 'log1'
      },
      {
        ID: 'trackable2',
        Name: 'Second Trackable',
        Inserted: true,
        VisitLog: 'log2'
      },
      {
        ID: 'trackable3',
        Name: 'Third Trackable',
        Inserted: true,
        VisitLog: 'log3'
      },
    ]

    for (const trackable of trackables) {
      await ctx.stub.putState(this.makeTrackableID(trackable.ID), this.serializeTrackable(trackable))
      console.info(`Trackable ${trackable.ID} initialized`)
    }
  }
}
