import { Echo as LaravelEcho } from "laravel-echo";
import PusherJs from "pusher-js";

declare module "laravel-echo" {
  interface Echo extends LaravelEcho {
    connector: {
      pusher: PusherJs;
    };
  }
}
