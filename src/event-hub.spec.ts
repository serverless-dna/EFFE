import {Channel, EventHub, EventMessage, WildCardChannel} from './event-hub';

describe('[Channel] ', () => {
  let channel: Channel<boolean>;

  beforeEach(() => {
    channel = new Channel<boolean>('test');
  });

  it('lastEvent should be undefined when no events published', ()=> {
    expect(channel.lastEvent).toBeUndefined();
  });

  it('callbacks should be empty with no subscribers', () => {
    expect(Object.keys(channel.callbacks).length).toBe(0);
  });

  it('Should have a name property [test]', () => {
    expect(channel.name).toBe('test');
  });
});

describe('[Channel]', () => {
  let channel: Channel<boolean>;
  let eventChannel : string;
  let eventData: boolean;
  let subscription: any;

  beforeEach(() => {
    channel = new Channel<boolean>('test');
    eventData = false;
    subscription = channel.subscribe((data: EventMessage<boolean>) => {
      eventData = data.data;
      eventChannel = data.channel;
    });
  });

  it('Should return 1 for the first subscriber', () => {
    expect(subscription.id).toBe(1);
  });

  it('Should call each callback when an event is published', () => {
    channel.publish(true);
    expect(eventData).toBeTruthy();
  });

  it('Should  include a properly formatted EventMessage when events are published', () => {
    expect(eventChannel).toBe('test')
  });

  it('Should return the last event when called', () => {
    channel.publish(true);
    expect(channel.lastEvent).toBeTruthy();
  });

  it('Should remove the subscriber when I call unsubscribe', () => {
    subscription.unsubscribe();
    expect(Object.keys(channel.callbacks).length).toBe(0);
  });

  it('Should replay the last event when I subscribe with replay active', () => {
    channel.publish(true);
    eventData = false;
    channel.subscribe((data: EventMessage<boolean>) => {
      eventData = data.data;
    }, true);
    expect(eventData).toBeTruthy();
  });
});

describe('[EventHub]: subscribe', () => {
  let eventHub: EventHub;
  let eventData: boolean;
  let publishCount: number;

  beforeEach(() => {
    eventHub = new EventHub();
    eventData = false;
    publishCount = 0;
  });

  it('Should add a channel when I subscribe', () => {
    eventHub.subscribe<boolean>('test', (data: EventMessage<boolean>) => {
      eventData = data.data;
      publishCount++;
    });
    // need to take into account the WildCardChannel
    expect(Object.keys(eventHub.channels).length).toBe(2);
  });

  it('Should not add another channel when I subscribe to the same channel',
    () => {
      eventHub.subscribe<boolean>('test', (data: EventMessage<boolean>) => {
        eventData = data.data;
      });
      eventHub.subscribe<boolean>('test', (data: EventMessage<boolean>) => {
        eventData = data.data;
      });
      expect(Object.keys(eventHub.channels).length).toBe(2);
    });

  it('Should add another channel when I subscribe to a unique name', () => {
    eventHub.subscribe<boolean>('test', (data: EventMessage<boolean>) => {
      eventData = data.data;
    });
    eventHub.subscribe<boolean>('another', (data: EventMessage<boolean>) => {
      eventData = data.data;
      publishCount++;
    });
    expect(Object.keys(eventHub.channels).length).toBe(3);
  });

  it('Should call the callback when I publish an event', () => {
    eventHub.subscribe<boolean>('test', (data: EventMessage<boolean>) => {
      eventData = data.data;
      publishCount++;
    });
    eventHub.publish<boolean>('test', true);
    expect(eventData).toBeTruthy();
    expect(publishCount).toBe(1);
  });

  it('Should return Subscription from the channel. Unsubscribing will not remove the EventHub channel', () => {
    let eventData: string = '';
    const sub = eventHub.subscribe<string>('tester', (data: EventMessage<string>) => {
      eventData = data.data;
    });

    eventHub.publish<string>('tester', 'this is a test');
    expect(eventData).toBe('this is a test');
    expect(sub).toHaveProperty('unsubscribe');

    const channels = eventHub.channels;
    const channelCount = Object.keys(channels).length;
    const callbackCount = Object.keys(eventHub.channels['tester'].callbacks).length;
    sub.unsubscribe();
    expect(Object.keys(channels).length).toBe(channelCount);
  });

  it('Should remove the callback function from the channel callback list when unsubscribing', () => {
    let eventData: string = '';
    const sub = eventHub.subscribe<string>('tester', (data: EventMessage<string>) => {
      eventData = data.data;
    });

    eventHub.publish<string>('tester', 'this is a test');
    expect(eventData).toBe('this is a test');
    expect(sub).toHaveProperty('unsubscribe');

    const channels = eventHub.channels;
    const callbackCount = Object.keys(eventHub.channels['tester'].callbacks).length;
    sub.unsubscribe();
    expect(Object.keys(eventHub.channels['tester'].callbacks).length).toBe(callbackCount - 1);
  });

});

describe('[EventHub]: Wildcard Subscribe', () => {
  let eventHub: EventHub;
  let eventData: string;

  beforeEach(() => {
    eventHub = new EventHub();
    eventData = '';
  });

  it('Should add my callback to the channel when I subscribe', () => {
    eventHub.subscribe<string>('*', (data: EventMessage<string>) => {
      eventData = data.data;
    });
    expect(Object.keys(eventHub.channels).length).toBe(1);
    expect(Object.keys(eventHub.channels[WildCardChannel].callbacks).length).toBe(1);
  });

  it('Should call the callback when I publish an event', () => {
    eventHub.subscribe<string>('*', (data: EventMessage<string>) => {
      eventData = data.data;
    });
    eventHub.publish<string>('test', 'this is a test');
    expect(eventData).toBe('this is a test');
  });

  it('Should call the callback when I publish an event no matter the channel published to', () => {
    eventHub.subscribe<string>('*', (data: EventMessage<string>) => {
      eventData = data.data;
    });
    eventHub.publish<string>('another', 'this is another test');
    expect(eventData).toBe('this is another test');
  });
});

describe('[EventHub]: publish', () => {
  let eventHub: EventHub;

  beforeEach(() => {
    eventHub = new EventHub();
  });

  it('Should add a channel when I publish to a new channel', () => {
    eventHub.publish<string>('new channel', 'created it!');
    expect(eventHub.lastEvent<string>('new channel')).toBe('created it!');
    expect(Object.keys(eventHub.channels).length).toBe(2);
    eventHub.publish<boolean>('another channel', true);
    expect(Object.keys(eventHub.channels).length).toBe(3);
    expect(eventHub.lastEvent<boolean>('another channel')).toBeTruthy();
  });

  it('Should add a channel when I check for the last event', () => {
    const lastEvent = eventHub.lastEvent<Record<string, any>>('newest channel');
    expect(lastEvent).toBeUndefined();
    expect(Object.keys(eventHub.channels).length).toBe(2);
  });
});
