import Docker from "dockerode";
import { config } from "../config.js";
import { parse } from "shell-quote";

const docker = new Docker({
  socketPath: config.dockerHost || (process.platform === "win32" ? "//./pipe/docker_engine" : "/var/run/docker.sock")
});

async function pullImage(image) {
  return new Promise((resolve, reject) => {
    docker.pull(image, (err, stream) => {
      if (err) {
        reject(err);
        return;
      }
      docker.modem.followProgress(stream, (pullErr) => {
        if (pullErr) {
          reject(pullErr);
          return;
        }
        resolve();
      });
    });
  });
}

export async function runContainer(image, command) {
  await pullImage(image);

  const cmd = command ? parse(command).filter((part) => typeof part === "string") : undefined;

  const container = await docker.createContainer({
    Image: image,
    Cmd: cmd && cmd.length > 0 ? cmd : undefined,
    Tty: false
  });

  await container.start();
  const waitResult = await container.wait();
  const logsBuffer = await container.logs({
    stdout: true,
    stderr: true
  });

  const logs = logsBuffer.toString("utf-8");
  await container.remove({ force: true });

  return {
    containerId: container.id,
    exitCode: waitResult.StatusCode ?? null,
    logs
  };
}

export async function stopContainer(containerId) {
  const container = docker.getContainer(containerId);
  await container.stop({ t: 5 });
  await container.remove({ force: true });
}
