import { Channel, EventHub } from './event-hub';

describe('[Channel] ', () => {
  const channel = new Channel<boolean>('test');
  it('lastEvent should be undefined when no events published', ()=> {
    expect(channel.lastEvent).toBeUndefined();
  })
  it('callbacks should be empty with no subscribers', () => {
    expect(Object.keys(channel.callbacks).length).toBe(0);
  })
  it('Should have a name property [test]', () => {
    expect(channel.name).toBe('test');
  })
})

describe('[Channel]', () => {
  let eventData: boolean;
  const channel = new Channel<boolean>('test');

  const subscription =  channel.subscribe((data: boolean) => {
    eventData = data;
  });
  it('Should return 1 for the first subscriber', () => {
    expect(subscription.id).toBe(1);
  })

  it('Should call each callback when an event is published', () => {
    channel.publish(true);
    expect(eventData).toBeTruthy();
  })

  it('Should return the last event when called', () => {
    expect(channel.lastEvent).toBeTruthy();
  });

  it('Should remove the subscriber when I call unsubscribe', () => {
    subscription.unsubscribe();
    expect(Object.keys(channel.callbacks).length).toBe(0);
  });

  it('Should replay the last event when I subscribe with replay active', () => {
    eventData = false;
    channel.subscribe((data: boolean) => {
      eventData = data;
    }, true);
    expect(eventData).toBeTruthy();
  })
});

describe('[EventHub]: subscribe', () => {
  const eventHub = new EventHub();
  let eventData: boolean = false;
  let publishCount = 0;
  it('Should add a channel when I subscribe', () => {
    eventHub.subscribe<boolean>('test', (data: boolean) => {
      eventData = data;
      publishCount++;
    });
    expect(Object.keys(eventHub.channels).length).toBe(1);
  });

  it('Should not add another channel when I subscribe to the same channel', () => {
    eventHub.subscribe<boolean>('test', (data: boolean) => {
      eventData = data;
    });
    expect(Object.keys(eventHub.channels).length).toBe(1);
  });

  it('Should add another channel when I subscribe to a unique name', () => {
    eventHub.subscribe<boolean>('another', (data: boolean) => {
      eventData = data;
      publishCount++;
    });
    expect(Object.keys(eventHub.channels).length).toBe(2);
  });

  it('Should call the callback when I publish an event', () => {
    eventHub.publish<boolean>('test', true);
    expect(eventData).toBeTruthy();
    expect(publishCount).toBe(1);
  });

  it('Should return Subscription from the channel.  Unsubscribing will not remove the EventHub channel', () => {
    let eventData: string = '';
    const sub = eventHub.subscribe<string>('tester', (data: string) => {
      eventData = data;
    });

    eventHub.publish<string>('tester', 'this is a test');
    expect(eventData).toBe('this is a test');
    expect(sub).toHaveProperty('unsubscribe');

    const channels = eventHub.channels;
    expect(Object.keys(channels).length).toBe(3);
    sub.unsubscribe();
    expect(Object.keys(channels).length).toBe(3);
  });
});

describe('[EventHub]: publish', () => {
  const eventHub = new EventHub();

  it('Should add a channel when I publish to a new channel', () => {
     eventHub.publish<string>('new channel', 'created it!');
     expect(eventHub.lastEvent<string>('new channel')).toBe('created it!');
     expect(Object.keys(eventHub.channels).length).toBe(1);
     eventHub.publish<boolean>('another channel', true);
     expect(Object.keys(eventHub.channels).length).toBe(2);
     expect(eventHub.lastEvent<boolean>('another channel')).toBeTruthy();
  });

  it('Should add a channel when I check for the last event', () => {
    const lastEvent = eventHub.lastEvent<Record<string, any>>('newest channel');
    expect(lastEvent).toBeUndefined();
    expect(Object.keys(eventHub.channels).length).toBe(3);
  })

});

