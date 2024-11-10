
/**
 * Function signature for callbacks registered for receiving events on a channel.
 *
 * @template TEvent The type of event that this callback handles.
 * @callback EventCallback
 * @param {TEvent} event - The event that was published on the channel.
 * @returns {void}
 *
 * @example
 * const callback: EventCallback<string> = (message) => {
 *   console.log(`Received message: ${message}`);
 * };
 */
export type EventCallback<TEvent> = (event: TEvent) => void;

/**
 * Subscription object returned when a callback is subscribed to an EventHub channel.
 * It contains the unsubscribe function to de-register a callback from the EventHub channel
 * and the unique identifier for this subscription.
 *
 * @typedef {Object} Subscription
 * @property {() => void} unsubscribe - Function to unsubscribe the callback from the channel.
 * @property {number} id - Unique identifier for this subscription.
 *
 * @example
 * const subscription = eventHub.subscribe('myChannel', myCallback);
 * // Later, to unsubscribe:
 * subscription.unsubscribe();
 */
export type Subscription = {
  unsubscribe(): void;
  id: number;
};

/**
 * Represents a list of callbacks subscribed to a channel, indexed by their subscription IDs.
 *
 * @template TEvent The type of event that these callbacks handle.
 * @typedef {Object.<number, EventCallback<TEvent>>} CallbackList
 */
export type CallbackList<TEvent> = Record<number, EventCallback<TEvent>>;

/**
 * Manages callback subscribers for a channel.
 *
 * @class Channel
 * @template TEvent The type of event that this channel handles
 * @property {string} _name - The name of the channel
 * @property {TEvent | undefined} _lastEvent - The last event that was published on the channel
 * @property {number} _lastId - The last assigned callback ID
 * @property {CallbackList<TEvent>} _callbacks - The callbacks that are subscribed to the channel
 *
 * @description
 * The Channel class is responsible for managing subscriptions and publications for a specific event type.
 * It maintains a list of callback functions and allows publishing events to all subscribers.
 * It also keeps track of the last event published on the channel for potential replay functionality.
 *
 * @example
 * const channel = new Channel<string>('myChannel');
 * const subscription = channel.subscribe((message) => console.log(message));
 * channel.publish('Hello, World!');
 * // Output: Hello, World!
 */
export class Channel<TEvent> {
  private _name: string;
  private _lastEvent: TEvent|undefined;
  private _lastId = 0;
  private _callbacks: CallbackList<TEvent> = {};

  /**
   * Creates a new Channel instance.
   *
   * @param {string} name - The name of the channel. This is used to identify the channel within the EventHub.
   */
  constructor(name: string) {
    this._name = name;
  }

  /**
   * Generates the next unique ID for registered callback functions.
   *
   * @private
   * @returns {number} The next available callback ID.
   */
  private getNextId(): number {
      return ++this._lastId;
  }

  /**
   * Subscribes to events on the channel. Each event received will be passed to the callback function.
   *
   * @param {EventCallback<TEvent>} callback - The function to be called when an event is published on this channel.
   * @param {boolean} [replay=false] - If true, immediately calls the callback with the last event, if one exists.
   * @returns {Subscription} An object containing the unsubscribe method and the subscription ID.
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
   * Publishes an event to the channel, notifying all subscribers.
   *
   * @param {TEvent} data - The event data to be published to all subscribers.
   */
  publish(data: TEvent) {
      this._lastEvent = data;
      Object.values(this._callbacks).forEach((callback) => {
          callback(data);
      });
  }

  /**
   * Retrieves the last event that was published on the channel.
   *
   * @returns {TEvent | undefined} The last event that was published on the channel, or undefined if no event has been published.
   */
  get lastEvent(): TEvent | undefined {
      return this._lastEvent;
  }

  /**
   * Retrieves the name of the channel.
   *
   * @returns {string} The name of the channel.
   */
  get name(): string {
    return this._name;
  }

  /**
   * Retrieves the list of callbacks that are subscribed to the channel.
   *
   * @returns {CallbackList<TEvent>} An object containing all the callbacks subscribed to the channel, keyed by their subscription IDs.
   */
  get callbacks(): CallbackList<TEvent> {
      return this._callbacks;
  }
}

/**
 * Implements the EventHub which enables a simple publish/subscribe mechanism for loosely coupled event passing between
 * registered components.
 *
 * @class EventHub
 * @description
 * This class manages multiple channels for event communication. It allows components to subscribe to specific channels,
 * publish events to channels, and retrieve the last event published on a channel. The EventHub acts as a central
 * coordinator for all event-based communication within an application.
 *
 * Key features:
 * - Dynamic channel creation: Channels are created on-demand when publishing or subscribing.
 * - Type-safe events: Each channel can handle a specific event type.
 * - Last event retrieval: Ability to get the most recent event from any channel.
 * - Subscription management: Easy subscription and unsubscription mechanism.
 *
 * @property {Record<string, Channel<any>>} _channels - Private property that stores all the channels managed by the event hub.
 * Each key is a channel name, and the value is the corresponding Channel instance.
 *
 * @method subscribe - Allows components to subscribe to a specific channel and receive events published on that channel.
 * @method publish - Allows components to publish an event to a specific channel, notifying all subscribers.
 * @method lastEvent - Retrieves the last event that was published on a specified channel.
 * @method channels - Getter that returns all channels currently managed by the EventHub.
 *
 * @example
 * const eventHub = new EventHub();
 * const subscription = eventHub.subscribe('userLogin', (user) => console.log(`${user} logged in`));
 * eventHub.publish('userLogin', 'Alice');
 * // Output: Alice logged in
 * console.log(eventHub.lastEvent('userLogin')); // Output: Alice
 * subscription.unsubscribe();
 */
export class EventHub {
  /**
   * Holds the list of channels created by publish/subscribe methods of the EventHub
   *
   * @private
   */
  private _channels: Record<string, Channel<any>> = {};

  /**
   * Creates a new EventHub instance.
   * 
   * @description
   * The constructor initializes an empty channels object. Channels are created dynamically
   * as they are subscribed to or published to.
   */
  constructor() {}

  /**
   * Retrieves all channels currently subscribed to the event hub.
   *
   * @returns {Record<string, Channel<any>>} An object containing all channels, where keys are channel names and values are Channel instances.
   */
  get channels(): Record<string, Channel<any>> {
      return this._channels;
  }

  /**
   * Subscribes to all events sent on a specific channel of the event hub.
   *
   * @template TEvent The type of event that this subscription handles.
   * @param {string} channel - The name of the channel to subscribe to.
   * @param {EventCallback<TEvent>} callback - The function to be called by the EventHub for each event published on this channel.
   * @param {boolean} [replay=false] - If true, immediately replays the last event sent on this channel (if any).
   * @returns {Subscription} An object containing the unsubscribe method and the subscription ID.
   */
  subscribe<TEvent>(channel: string, callback: EventCallback<TEvent>, replay: boolean = false): Subscription {
      if (!this._channels[channel]) {
          this._channels[channel] = new Channel<TEvent>(channel);
      }
      return this._channels[channel].subscribe(callback, replay);
  }

  /**
   * Publishes an event to a specific channel on the event hub.
   *
   * @template TEvent The type of event being published.
   * @param {string} channel - The name of the channel to publish the event to.
   * @param {TEvent} data - The event data to be sent to each subscriber of the channel.
   */
  publish<TEvent>(channel: string, data: TEvent): void {
      if (!this._channels[channel]) {
          this._channels[channel] = new Channel<TEvent>(channel);
      }
      this._channels[channel].publish(data);
  }

  /**
   * Retrieves the last event that was published on a specific channel.
   *
   * @template TEvent The type of event expected from this channel.
   * @param {string} channel - The name of the channel to retrieve the last event from.
   * @returns {TEvent | undefined} The last event that was published on the channel, or undefined if no event has been published.
   */
  lastEvent<TEvent>(channel: string): TEvent | undefined {
      if (!this._channels[channel]) {
          this._channels[channel] = new Channel<TEvent>(channel);
      }
      return this._channels[channel].lastEvent;
  }
}
