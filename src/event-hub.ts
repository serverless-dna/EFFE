/**
 * Represents a message that can be published through the EventHub system.
 *
 * @interface EventMessage
 * @template T The type of data contained in the message
 *
 * @property {string} channel - The name of the channel this message will be published to
 * @property {T} data - The payload/content of the message
 *
 * @example
 * // Message with string data
 * const stringMessage: EventMessage<string> = {
 *   channel: "notifications",
 *   data: "Hello World"
 * };
 *
 * // Message with custom type
 * interface UserData {
 *   id: number;
 *   name: string;
 * }
 * const userMessage: EventMessage<UserData> = {
 *   channel: "users",
 *   data: { id: 1, name: "John" }
 * };
 */
export interface EventMessage<T> {
  channel: string;
  data: T;
}

/**
 * Function signature for callbacks registered for receiving events on a channel.
 *
 * @template TData The type of data contained in the event message.
 * @callback EventCallback
 * @param {EventMessage<TData>} event - The event message that was published on the channel.
 * @returns {void}
 *
 * @example
 * const callback: EventCallback<string> = (message) => {
 *   console.log(`Received message on channel ${message.channel}: ${message.data}`);
 * };
 */
export type EventCallback<TData> = (data: EventMessage<TData>) => void;

/**
 * Constant representing the wild card channel where ALL events get broadcast to.
 */
export const WildCardChannel = '*';

/**
 * Subscription object returned when a callback is subscribed to an EventHub channel.
 * It contains the unsubscribe function to de-register a callback from the EventHub channel
 * and the unique identifier for this subscription.
 *
 * @property {() => void} unsubscribe - Function to unsubscribe the callback from the channel.
 * @property {number} id - Unique identifier for this subscription.
 *
 * @example
 * const subscription = eventHub.subscribe('myChannel', myCallback);
 * // Later, to unsubscribe:
 * subscription.unsubscribe();
 */
export interface Subscription {
  unsubscribe: () => void;
  id: number;
}

/**
 * Represents a list of callbacks subscribed to a channel, indexed by their subscription IDs.
 *
 * @template TData The type of data that the event messages include.
 */
export type CallbackList<TData> = Record<number, EventCallback<TData>>;

/**
 * Manages callback subscribers for a channel.
 *
 * @class Channel
 * @template TData The type of event data that this channel handles
 * @property {string} _name - The name of the channel
 * @property {TData | undefined} _lastEvent - The last event that was published on the channel
 * @property {number} _lastId - The last assigned callback ID
 * @property {CallbackList<TData>} _callbacks - The callbacks that are subscribed to the channel
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
export class Channel<TData> {
  private readonly _name: string;
  private _lastEvent: TData|undefined;
  private _lastId = 0;
  private _callbacks: CallbackList<TData> = {};

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
   * @param {EventCallback<TData>} callback - The function to be called when an event is published on this channel.
   * @param {boolean} [replay=false] - If true, immediately calls the callback with the last event, if one exists.
   * @returns {Subscription} An object containing the unsubscribe method and the subscription ID.
   */
  subscribe(callback: EventCallback<TData>, replay: boolean = false): Subscription {
      const id = this.getNextId();
      const lastEvent = this._lastEvent;
      this._callbacks[id] = callback;

      // replay the last event
      if(replay && lastEvent) {
          callback({
            channel: this.name,
            data: lastEvent
          });
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
   * @param {TData} data - The event data to be published to all subscribers.
   */
  publish(data: TData) {
      this._lastEvent = data ;
      Object.values(this._callbacks).forEach((callback) => {
        callback({
          channel: this.name,
          data});
      });
  }

  /**
   * Retrieves the last event that was published on the channel.
   *
   * @returns {TData | undefined} The last event that was published on the channel, or undefined if no event has been published.
   */
  get lastEvent(): TData | undefined {
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
   * @returns {CallbackList<TData>} An object containing all the callbacks subscribed to the channel, keyed by their subscription IDs.
   */
  get callbacks(): CallbackList<TData> {
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
   * The constructor initializes a wildcard channel object.
   * Channels are created dynamically as they are subscribed to or published to.
   */
  constructor() {
    // Create the Wildcard Channel
    this._channels[WildCardChannel] = new Channel<any>(WildCardChannel);
  }

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
   * @template TData The type of event that this subscription handles.
   * @param {string} channel - The name of the channel to subscribe to.
   * @param {EventCallback<TData>} callback - The function to be called by the EventHub for each event published on this channel.
   * @param {boolean} [replay=false] - If true, immediately replays the last event sent on this channel (if any).
   * @returns {Subscription} An object containing the unsubscribe method and the subscription ID.
   */
  subscribe<TData>(channel: string, callback: EventCallback<TData>, replay: boolean = false): Subscription {
      if (!this._channels[channel]) {
          this._channels[channel] = new Channel<TData>(channel);
      }
      return this._channels[channel].subscribe(callback, replay);
  }

  /**
   * Publishes an event to a specific channel on the event hub.
   *
   * @template TData The type of event being published.
   * @param {string} channel - The name of the channel to publish the event to.
   * @param {TData} data - The event data to be sent to each subscriber of the channel.
   */
  publish<TData>(channel: string, data: TData): void {
      if (!this._channels[channel]) {
          this._channels[channel] = new Channel<TData>(channel);
      }
      this._channels[channel].publish(data);

      // also publish to the wildcard channel
      this._channels[WildCardChannel].publish(data);
      this._channels[WildCardChannel].publish(data);
  }

  /**
   * Retrieves the last event that was published on a specific channel.
   *
   * @template TEvent The type of event expected from this channel.
   * @param {string} channel - The name of the channel to retrieve the last event from.
   * @returns {TEvent | undefined} The last event that was published on the channel, or undefined if no event has been published.
   */
   lastEvent<TData>(channel: string): EventMessage<TData> | undefined {
      if (!this._channels[channel]) {
          this._channels[channel] = new Channel<TData>(channel);
      }
      return this._channels[channel].lastEvent;
  }
}
