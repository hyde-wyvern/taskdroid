# Use Taskdroid from another device

Tailscale lets you open your Taskdroid dashboard privately from another device on your tailnet. Taskdroid and your project files stay on your computer; that computer must be on and connected whenever you use the dashboard remotely.

## Before you start

- Install Tailscale and sign in on the computer running Taskdroid and on the device you will use remotely.
- Make sure your tailnet access rules allow only people and devices you trust to reach the host. The Taskdroid dashboard has no sign-in; anyone with tailnet access to it can read and change project data.

See [Tailscale access control](https://tailscale.com/docs/features/access-control) to manage who can reach devices on your tailnet.

## Start the dashboard

On the computer that has your project, open a terminal in the project directory and run:

```sh
taskdroid ui --host 127.0.0.1 --port 4317 --no-open
```

Keep this running. In a second terminal on the same computer, enable private access:

```sh
tailscale serve --bg http://127.0.0.1:4317
tailscale serve status
```

If Tailscale asks you to enable HTTPS for your tailnet, follow its prompt. `tailscale serve status` shows the private HTTPS address for the dashboard.

## Open it from another device

Connect the device to the same tailnet and open the HTTPS address shown by `tailscale serve status`. You can bookmark that address. The host computer and its `taskdroid ui` process must remain running for the dashboard to work.

If you want to check that everything is working, open a project page and reload it. To confirm edits are saved, try a small change in a project you can safely use for testing.

## If it stops working

- **The page does not load:** make sure both devices are connected to Tailscale and the host computer is awake.
- **The local dashboard stopped:** restart `taskdroid ui` from the project directory with the same command.
- **The Tailscale address is missing:** run `tailscale serve status` again. If needed, repeat the `tailscale serve` command above.
- **Port 4317 is already in use:** choose a different unused port and use it in both the `taskdroid ui` and `tailscale serve` commands.

## Stop remote access

Stop Taskdroid with `Ctrl+C`. To remove the Tailscale route as well, run:

```sh
tailscale serve --bg http://127.0.0.1:4317 off
```

This guide uses Tailscale **Serve**, which is private to your tailnet. Do not use Tailscale **Funnel** for this dashboard; Funnel exposes services to the public internet. See the [Tailscale Serve guide](https://tailscale.com/docs/features/tailscale-serve) for more details.
