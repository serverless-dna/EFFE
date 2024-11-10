/**
 * @interface Event
 * @property {string} channel - The channel the event was published on
 * @property {Record<string, any>} data - The data associated with the event
 */
export interface Event {
  channel: string;
  data: Record<string, any> | string | boolean;
}

/**
 * @type EventCallback
 * @template TEvent
 * @param {TEvent} event - The event that was published
 */
export type EventCallback<TEvent> = (event: TEvent) => void;

/**
 * @type Subscription
 * @property {() => void} unsubscribe - Unsubscribe from the channel
 */
export type Subscription = {
  unsubscribe(): void;
  id: number;
};

/**
 * @type CallbackList
 * @template TEvent
 * @param {TEvent} event - The event that was published
 */
export type CallbackList<TEvent> = Record<number, EventCallback<TEvent>>;

/**
 * @class Channel
 * @template TEvent
 * @property {TEvent} _lastEvent - The last event that was published on the channel
 * @property {EventCallback<TEvent>[]} _callbacks - The callbacks that are subscribed to the channel
 * @method subscribe - Subscribe to the channel
 * @method publish - Publish an event to the channel
 * @method get lastEvent - Get the last event that was published on the channel
 */
export class Channel<TEvent> {
  private _name: string;
  private _lastEvent: TEvent|undefined;
  private _lastId = 0;
  private _callbacks: CallbackList<TEvent> = {};

  /**
   * Create a Channel
   * @param name
   */
  constructor(name: string) {
    this._name = name;
  }

  /**
   * Get the next id for a callback
   * @private
   * @returns next available callback id
   */
  private getNextId(): number {
      return ++this._lastId;
  }

  /**
   * Subscribe to an event on the channel
   * @param callback
   * @param replay
   * @returns {Subscription} An object containing the unsubscribe callback
   */
  subscribe(callback: EventCallback<TEvent>, replay = false): Subscription {
      const id = this.getNextId();
      const lastEvent = this._lastEvent;
      this._callbacks[id] = callback;

      // replay the last event
      if(replay && lastEvent) {
          callback(lastEvent);
      }

      return {
          unsubscribe: () => {
              delete this._callbacks[id];
          },
          id,
      };
  }

  /**
   * Publish an event to the channel
   * @param data
   */
  publish(data: TEvent) {
      this._lastEvent = data;
      Object.values(this._callbacks).forEach((callback) => {
          callback(data);
      });
  }

  /**
   * Get the last event that was published on the channel
   * @returns {TEvent} The last event that was published on the channel
   */
  get lastEvent(): TEvent | undefined {
      return this._lastEvent;
  }

  /**
   * Get the name of the channel
   * @returns {string} The name of the channel
   */
  get name(): string {
    return this._name;
  }

  /**
   * Get the callbacks that are subscribed to the channel
   * @returns {EventCallback<TEvent>[]} The callbacks that are subscribed to the channel
   */
  get callbacks(): CallbackList<TEvent> {
      return this._callbacks;
  }
}

/**
 * @class EventHub
 * @property {Record<string, any>} _channels - The channels that are subscribed to the event hub
 * @method subscribe - Subscribe to an event on the event hub
 * @method publish - Publish an event to the event hub
 * @method lastEvent - Get the last event that was published on a channel
 */
export class EventHub {
  private _channels: Record<string, Channel<any>> = {};

  /**
   * Get the channels that are subscribed to the event hub
   * @returns {Record<string, any>} The channels that are subscribed to the event hub
   */
  get channels() : Record<string, Channel<any>> {
      return this._channels;
  }

  /**
   * Subscribe to an event on the event hub
   * @template TEvent
   * @param channel
   * @param callback
   * @param replay
   * @returns {Subscription} An object containing the unsubscribe callback and the callback id
   */
  subscribe<TEvent>(channel: string, callback: EventCallback<TEvent>, replay: boolean = false): Subscription {
      if (!this._channels[channel]) {
          this._channels[channel] = new Channel<TEvent>(channel);
      }
      return this._channels[channel].subscribe(callback, replay);
  }

  /**
  * Publish an event to the event hub
  * @template TEvent
  * @param channel
  * @param data
  */
  publish<TEvent>(channel: string, data: TEvent) {
      if (!this._channels[channel]) {
          this._channels[channel] = new Channel<TEvent>(channel);
      }
      this._channels[channel].publish(data);
  }

  /**
  * Get the last event that was published on a channel
  * @template TEvent
  * @param channel
  * @returns {TEvent} The last event that was published on the channel
  */
  lastEvent<TEvent>(channel: string): TEvent {
      if (!this._channels[channel]) {
          this._channels[channel] = new Channel<TEvent>(channel);
      }
      return this._channels[channel].lastEvent;
  }
}
