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
  @Param('CacheID', 'string')
  @Param('Name', 'string')
  @Param('Description', 'string')
  @Param('GPSX', 'number')
  @Param('GPSY', 'number')
  @Param('Pass', 'string')
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
  @Param('CacheID', 'string')
  async DeleteCache (ctx: Context, CacheID: string): Promise<string> {
    await this.assertCacheExists(ctx, CacheID)

    const Maintainer = this.deserializeCache(await ctx.stub.getState(this.makeCacheID(CacheID))).Maintainer

    this.assertMaintainer(ctx, Maintainer)

    await ctx.stub.deleteState(this.makeCacheID(CacheID))

    return CacheID
  }

  @Transaction(false)
  @Returns('string')
  @Param('CacheID', 'string')
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
  @Param('CacheID', 'string')
  @Param('Name', 'string')
  @Param('Description', 'string')
  @Param('GPSX', 'number')
  @Param('GPSY', 'number')
  @Param('Pass', 'string')
  async CreateCache (ctx: Context, CacheID: string, Name: string, Description: string, GPSX: number, GPSY: number, Pass: string): Promise<Cache> {
    await this.assertCacheNotExists(ctx, CacheID)
    const Maintainer: string = this.getUserID(ctx)
    const cache: Cache = { ID: CacheID, Name, Description, GPSX, GPSY, Report:"", Pass, Maintainer }
    await ctx.stub.putState(this.makeCacheID(CacheID), this.serializeCache(cache))

    return cache
  }

  @Transaction(false)
  @Returns('Cache')
  @Param('CacheID', 'string')
  async GetCache (ctx: Context, CacheID: string): Promise<Cache> {
    await this.assertCacheExists(ctx, CacheID)

    return this.hideHiddenValues(ctx, this.deserializeCache(await ctx.stub.getState(this.makeCacheID(CacheID))))
  }

  @Transaction(false)
  @Returns('Cache[]')
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
  @Param('CacheID', 'string')
  async CacheExists (ctx: Context, CacheID: string): Promise<boolean> {
    const data: Uint8Array = await ctx.stub.getState(this.makeCacheID(CacheID))
    return data !== undefined && data.length > 0
  }

  @Transaction()
  @Returns('Cache')
  @Param('CacheID', 'string')
  @Param('Report', 'string')
  async ReportCache (ctx: Context, CacheID: string, Report: string): Promise<Cache> {
    await this.assertCacheExists(ctx, CacheID)

    const oldCache: Cache = this.deserializeCache(await ctx.stub.getState(this.makeCacheID(CacheID)))

    const newcache: Cache = { ID: CacheID, Name: oldCache.Name, Description: oldCache.Description, GPSX: oldCache.GPSX, GPSY: oldCache.GPSY, Report, Pass: oldCache.Pass, Maintainer: oldCache.Maintainer }
    await ctx.stub.putState(this.makeCacheID(CacheID), this.serializeCache(newcache))

    return this.hideHiddenValues(ctx, newcache)
  }

  // ------------- Logs -------------

  @Transaction()
  @Returns('VisitLog')
  @Param('LogID', 'string')
  @Param('CacheID', 'string')
  @Param('Pass', 'string')
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
  async GetLog (ctx: Context, LogID: string): Promise<VisitLog> {
    await this.assertLogExists(ctx, LogID)

    return this.deserializeLog(await ctx.stub.getState(LogID))
  }

  @Transaction(false)
  @Returns('VisitLog[]')
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
  @Param('LogID', 'string')
  async LogExists (ctx: Context, LogID: string): Promise<boolean> {
    const data: Uint8Array = await ctx.stub.getState(this.makeLogID(LogID))
    return data !== undefined && data.length > 0
  }

  // ------------- Trackables -------------

  @Transaction()
  @Returns('Trackable')
  @Param('TrackableID', 'string')
  @Param('LogID', 'string')
  @Param('Name', 'string')
  async CreateTrackable (ctx: Context, TrackableID: string, LogID: string, Name: string): Promise<Trackable> {
    await this.assertLogExists(ctx, LogID)
    await this.assertTrackableNotExists(ctx, TrackableID)

    const newVisitLog: VisitLog = this.deserializeLog(await ctx.stub.getState(this.makeLogID(LogID)))

    if(this.getUserID(ctx) != newVisitLog.User)
      throw new Error(`Visitlog is not made by the User!`)
    
    const trackable: Trackable = { ID: TrackableID, Name, Inserted: true, VisitLog: LogID }
    const newVisitLogEdited: VisitLog = {ID: newVisitLog.ID, Trackables: [...(newVisitLog.Trackables || []), `${TrackableID}-IN`], User: newVisitLog.User, Cache: newVisitLog.Cache, Time: newVisitLog.Time}

    await ctx.stub.putState(this.makeTrackableID(TrackableID), this.serializeTrackable(trackable))
    await ctx.stub.putState(this.makeLogID(newVisitLog.ID), this.serializeLog(newVisitLogEdited))

    return trackable
  }

  @Transaction()
  @Returns('Trackable')
  @Param('TrackableID', 'string')
  @Param('LogID', 'string')
  async InsertTrackable (ctx: Context, TrackableID: string, LogID: string): Promise<Trackable> {
    await this.assertLogExists(ctx, LogID)
    await this.assertTrackableExists(ctx, TrackableID)

    const trackable: Trackable = this.deserializeTrackable(await ctx.stub.getState(this.makeTrackableID(TrackableID)))

    if(trackable.Inserted == true)
      throw new Error(`Trackable is already inserted!`)

    const oldVisitLog: VisitLog = this.deserializeLog(await ctx.stub.getState(this.makeLogID(trackable.VisitLog)))
    const newVisitLog: VisitLog = this.deserializeLog(await ctx.stub.getState(this.makeLogID(LogID)))

    if((oldVisitLog.User != newVisitLog.User))
      throw new Error(`Trackable is not owned by the User!`)

    if(this.getUserID(ctx) != newVisitLog.User)
      throw new Error(`Visitlog is not made by the User!`)

    if(newVisitLog.Time <= oldVisitLog.Time)
      throw new Error(`Can not insert trackable into a log made before the current log!`)

    const newTrackable: Trackable = { ID: TrackableID, Name: trackable.Name, Inserted: true, VisitLog: LogID }
    const newVisitLogEdited: VisitLog = {ID: newVisitLog.ID, Trackables: [...(newVisitLog.Trackables || []), `${TrackableID}-IN`], User: newVisitLog.User, Cache: newVisitLog.Cache, Time: newVisitLog.Time}

    await ctx.stub.putState(this.makeTrackableID(TrackableID), this.serializeTrackable(newTrackable))
    await ctx.stub.putState(this.makeLogID(newVisitLog.ID), this.serializeLog(newVisitLogEdited))

    return newTrackable
  }

  @Transaction()
  @Returns('Trackable')
  @Param('TrackableID', 'string')
  @Param('LogID', 'string')
  async RemoveTrackable (ctx: Context, TrackableID: string, LogID: string): Promise<Trackable> {
    await this.assertLogExists(ctx, LogID)
    await this.assertTrackableExists(ctx, TrackableID)

    const trackable: Trackable = this.deserializeTrackable(await ctx.stub.getState(this.makeTrackableID(TrackableID)))

    if(trackable.Inserted != true)
      throw new Error(`Trackable is not inserted!`)

    const oldVisitLog: VisitLog = this.deserializeLog(await ctx.stub.getState(this.makeLogID(trackable.VisitLog)))
    const newVisitLog: VisitLog = this.deserializeLog(await ctx.stub.getState(this.makeLogID(LogID)))

    if(this.getUserID(ctx) != newVisitLog.User)
      throw new Error(`Visitlog is not made by the User!`)

    if(newVisitLog.Time <= oldVisitLog.Time)
      throw new Error(`Can not remove trackable from a log made before the current log!`)

    if(newVisitLog.Cache != oldVisitLog.Cache)
      throw new Error(`Trackable and Visitlog is for different caches!`)

    const newTrackable: Trackable = { ID: TrackableID, Name: trackable.Name, Inserted: false, VisitLog: LogID }
    const newVisitLogEdited: VisitLog = {ID: newVisitLog.ID, Trackables: [...(newVisitLog.Trackables || []), `${TrackableID}-OUT`], User: newVisitLog.User, Cache: newVisitLog.Cache, Time: newVisitLog.Time}

    await ctx.stub.putState(this.makeTrackableID(TrackableID), this.serializeTrackable(newTrackable))
    await ctx.stub.putState(this.makeLogID(newVisitLog.ID), this.serializeLog(newVisitLogEdited))

    return newTrackable
  }

  @Transaction(false)
  @Returns('Trackable')
  @Param('TrackableID', 'string')
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
  //ctx.stub.getStateByRange.returns(mockIterator)


  @Transaction(false)
  @Returns('boolean')
  @Param('TrackableID', 'string')
  async TrackableExists (ctx: Context, TrackableID: string): Promise<boolean> {
    const data: Uint8Array = await ctx.stub.getState(this.makeTrackableID(TrackableID))
    return data !== undefined && data.length > 0
  }

  //
  //--------------------- Dev ---------------------
  //

  @Transaction(false)
  @Returns('string')
  async WhoAmI (ctx: Context): Promise<string> {
    return this.getUserID(ctx)
  }

  //
  //--------------------- Helper ---------------------
  //

  // Permissions
  private assertMaintainer (ctx: Context, id: string): void {
    if (!(this.getUserID(ctx) == id)) {
      throw new Error(`Not maintainer`)
    }
  }

  private getUserID (ctx: Context): string {
    const user = JSON.stringify(ctx.clientIdentity.getID())
    if (user.slice(1, -1) != '' && user != null) {
      return user.slice(1, -1)
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

  // Caches

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
}
