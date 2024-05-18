/* SPDX-License-Identifier: Apache-2.0 */

import { Context, Contract, Info, Param, Returns, Transaction } from 'fabric-contract-api'
import stringify from 'json-stringify-deterministic'
import sortKeys from 'sort-keys-recursive'

import { Cache } from './cache'

@Info({ title: 'CacheTransfer', description: 'Simple cache transfer chaincode' })
export class CacheTransfer extends Contract {
  constructor () {
    super('CacheTransfer')
  }

  //
  //--------------------- Maintainer ---------------------
  //

  @Transaction()
  @Returns('Cache')
  async UpdateCache (ctx: Context, ID: string, Name: string, Description: string, GPSX: number, GPSY: number, Pass: string, Report: string): Promise<Cache> {
    await this.assertCacheExists(ctx, ID)

    const Maintainer = this.deserialize(await ctx.stub.getState(ID)).Maintainer

    this.assertMaintainer(ctx, Maintainer)

    const cache: Cache = { ID, Name, Description, GPSX, GPSY, Report, Pass, Maintainer }
    await ctx.stub.putState(ID, this.serialize(cache))

    return cache
  }

  @Transaction()
  @Returns('string')
  async DeleteCache (ctx: Context, ID: string): Promise<string> {
    await this.assertCacheExists(ctx, ID)

    const Maintainer = this.deserialize(await ctx.stub.getState(ID)).Maintainer

    this.assertMaintainer(ctx, Maintainer)

    await ctx.stub.deleteState(ID)

    return ID
  }

  @Transaction(false)
  @Returns('string')
  async ReadCachePass (ctx: Context, ID: string): Promise<string> {
    await this.assertCacheExists(ctx, ID)

    const Maintainer = this.deserialize(await ctx.stub.getState(ID)).Maintainer

    this.assertMaintainer(ctx, Maintainer)

    return this.deserialize(await ctx.stub.getState(ID)).Pass
  }

  //
  //--------------------- Public ---------------------
  //

  @Transaction()
  @Returns('Cache')
  async CreateCache (ctx: Context, ID: string, Name: string, Description: string, GPSX: number, GPSY: number, Pass: string): Promise<Cache> {
    await this.assertCacheNotExists(ctx, ID)
    const Maintainer: string = this.getUserID(ctx)
    const cache: Cache = { ID, Name, Description, GPSX, GPSY, Report:"", Pass, Maintainer }
    await ctx.stub.putState(ID, this.serialize(cache))

    return cache
  }

  @Transaction(false)
  @Returns('Cache')
  @Param('ID', 'string')
  async ReadCache (ctx: Context, ID: string): Promise<Cache> {
    await this.assertCacheExists(ctx, ID)

    return this.hideHiddenValues(ctx, this.deserialize(await ctx.stub.getState(ID)))
  }

  @Transaction(false)
  @Returns('string')
  async GetAllCaches (ctx: Context): Promise<Cache[]> {
    const results: Cache[] = []

    const iterator = await ctx.stub.getStateByRange('', '')
    let result = await iterator.next()
    while (!result.done) {
      results.push(this.hideHiddenValues(ctx, this.deserialize(result.value.value)))
      result = await iterator.next()
    }

    return results
  }

  @Transaction(false)
  @Returns('boolean')
  async CacheExists (ctx: Context, id: string): Promise<boolean> {
    const data: Uint8Array = await ctx.stub.getState(id)
    return data !== undefined && data.length > 0
  }

  @Transaction(false)
  @Returns('boolean')
  async LogExists (ctx: Context, id: string): Promise<boolean> {
    const data: Uint8Array = await ctx.stub.getState(`LOG-${id}`)
    return data !== undefined && data.length > 0
  }

  @Transaction()
  @Returns('Cache')
  @Param('ID', 'string')
  async ReportCache (ctx: Context, ID: string, Report: string): Promise<Cache> {
    await this.assertCacheExists(ctx, ID)

    const oldCache: Cache = this.deserialize(await ctx.stub.getState(ID))

    const newcache: Cache = { ID, Name: oldCache.Name, Description: oldCache.Description, GPSX: oldCache.GPSX, GPSY: oldCache.GPSY, Report, Pass: oldCache.Pass, Maintainer: oldCache.Maintainer }
    await ctx.stub.putState(ID, this.serialize(newcache))

    return this.hideHiddenValues(ctx, newcache)
  }

  // ------------- Logs -------------
  @Transaction()
  @Returns('Cache')
  async CreateLog (ctx: Context, ID: string, Pass: string, LogID: string, Log: string): Promise<string> {
    await this.assertCacheExists(ctx, ID)
    await this.assertLogNotExists(ctx, LogID)

    const cache: Cache = this.deserialize(await ctx.stub.getState(ID))

    if(Pass != cache.Pass)
      throw new Error(`Wrong Pass!`) 


    await ctx.stub.putState(`LOG-${LogID}`, Buffer.from(Log))

    return `Created log ${Log} with id ${LogID}`
  }
  
  //
  //--------------------- Admin ---------------------
  //
  
  @Transaction()
  async InitLedger (ctx: Context): Promise<void> {
    const caches: Cache[] = [
      {
        ID: 'cache1',
        Name: 'First Cache',
        Description: 'This is the first cache ever!',
        GPSX: 12,
        GPSY: 36,
        Report: "",
        Pass: "asd123",
        Maintainer: 'Chowder'
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
      await ctx.stub.putState(cache.ID, this.serialize(cache))
      console.info(`Cache ${cache.ID} initialized`)
    }
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
  

  private async assertCacheNotExists (ctx: Context, id: string): Promise<void> {
    if (await this.CacheExists(ctx, id)) {
      throw new Error(`Cache ${id} already exists`)
    }
  }

  private async assertCacheExists (ctx: Context, id: string): Promise<void> {
    if (!(await this.CacheExists(ctx, id))) {
      throw new Error(`Cache ${id} does not exist`)
    }
  }

  private async assertLogNotExists (ctx: Context, id: string): Promise<void> {
    if ((await this.LogExists(ctx, id))) {
      throw new Error(`Log ${id} does not exist`)
    }
  }
  
  private assertMaintainer (ctx: Context, id: string): void {
    if (!(this.getUserID(ctx) == id)) {
      throw new Error(`Not maintainer`)
    }
  }

  private getUserID (ctx: Context): string {
    const user = ctx.clientIdentity.getID()
    //ctx.clientIdentity.assertAttributeValue('role', 'admin')
    let regex = /\/CN=([^:]+):/;
    let match = JSON.stringify(user).match(regex);
    if (match) {
      return JSON.stringify(match[1])
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

  private serialize (cache: Cache): Buffer {
    return Buffer.from(stringify(sortKeys(cache)))
  }

  private deserialize (data: Uint8Array): Cache {
    return JSON.parse(data.toString()) as Cache
  }
}
