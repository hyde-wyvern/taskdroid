# Connect Taskdroid to ChatGPT

This guide connects one local Taskdroid project to ChatGPT through OpenAI Secure MCP Tunnel. Taskdroid keeps project files on your computer; ChatGPT receives MCP tool results and can make changes when you ask it to.

Your computer must be awake and the tunnel client running while you use the connection.

## 1. Create the tunnel and install its client

In [OpenAI Platform](https://platform.openai.com/settings/organization/tunnels), create a tunnel and a runtime API key allowed to use it. Keep the tunnel ID and key handy. The runtime key is separate from an organization admin key.

On macOS, install the client:

```sh
brew install openai/tools/tunnel-client
```

For other platforms, use the official [tunnel-client installation guide](https://github.com/openai/tunnel-client/blob/master/docs/onboarding.md).

Set the runtime key as `CONTROL_PLANE_API_KEY` in the environment where you will run `tunnel-client`. For example, from a trusted `.env` file in the current directory:

```sh
set -a
source .env
set +a
```

The client does not load `.env` automatically. Keep the file out of Git and never put the key in the profile command.

## 2. Bind a profile to your project

Use the absolute path to the project directory containing `.taskdroid/project.json`. Create a profile using the `taskdroid` command. Replace the tunnel ID and project path with your own. `taskdroid` must be available on the tunnel client's `PATH`.

```sh
tunnel-client init \
  --sample sample_mcp_stdio_local \
  --profile taskdroid-my-project \
  --tunnel-id tunnel_<your-id> \
  --mcp-command 'taskdroid mcp --project "/path/to/my-project"'
```

Each profile points to one project. To connect another project, create another profile with its own project path.

## 3. Check and run the tunnel

In the same Terminal environment where `CONTROL_PLANE_API_KEY` is set:

```sh
tunnel-client doctor --profile taskdroid-my-project --explain
tunnel-client run --profile taskdroid-my-project
```

Leave `run` active while using ChatGPT. The client must report ready. If it does not, see the official [tunnel health guide](https://github.com/openai/tunnel-client/blob/master/docs/health.md).

## 4. Connect ChatGPT

In ChatGPT, add a custom MCP server and choose **Tunnel** as the connection. Select the same tunnel, then create and install the app. Make sure the tunnel is associated with the workspace you are using and your account has permission to use it. See [ChatGPT custom MCP setup](https://developers.openai.com/api/docs/guides/custom-mcp-server).

In a chat, select the Taskdroid app and ask it to call `get_project`. Check that it returns the expected project, then try `list_plans`. Use a disposable project for your first write operation.

## Troubleshooting and disconnecting

- **The profile cannot start Taskdroid:** confirm `taskdroid` is available on the tunnel client's `PATH`; if needed, use the absolute path to the installed Taskdroid executable.
- **ChatGPT cannot see the tunnel:** check its workspace association and your tunnel-use permission.
- **ChatGPT cannot call tools:** keep `tunnel-client run` active and check `doctor` and the tunnel health guide.
- **The wrong project appears:** verify the project path in the profile command.

Stop the client with `Ctrl+C` to disconnect locally. Remove the custom MCP app in ChatGPT and revoke the runtime key in Platform when you no longer need them. Check Platform billing for any tunnel charges; tunnel access is separate from a ChatGPT subscription.
