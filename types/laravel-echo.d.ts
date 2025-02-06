import { Channel, PresenceChannel } from "laravel-echo";

declare module "laravel-echo" {
  interface Echo {
    channel(channel: string): Channel;
    private(channel: string): Channel;
    join(channel: string): PresenceChannel;
    leave(channel: string): void;
    leaveChannel(channel: string): void;
    disconnect(): void;
    connect(): void;
    connector: any;
  }
}
