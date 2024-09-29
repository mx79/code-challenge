import { ComponentSettings, Manager } from "@managed-components/types";
import mustache from "mustache";
import ticTacToeBoard from "./tic-tac-toe.html";

export default async function (manager: Manager, settings: ComponentSettings) {
  const emptyGame = [
    [null, null, null],
    [null, null, null],
    [null, null, null],
  ];

  // We don't load the widget if WORKER_URL is not defined in component settings
  const workerUrl = settings["WORKER_URL"];
  if (!workerUrl) {
    throw new Error("😢 WORKER_URL is not defined");
  }

  const crossImage = manager.serve("/cross", "assets/cross.svg");
  console.log(`:::: Serves cross image at ${crossImage}`);
  const roundImage = manager.serve("/round", "assets/round.svg");
  console.log(`:::: Serves round image at ${roundImage}`);
  const cloudflareLogo = manager.serve("/cloudflare", "assets/cloudflare.png");
  console.log(`:::: Serves Cloudflare logo at ${cloudflareLogo}`);

  manager.addEventListener("clientcreated", async (event) => {
    console.log("🚀 A new client has been created 🚀");
    const { client } = event;
    client.set("game", JSON.stringify(emptyGame));
  });

  manager.registerWidget(async () => {
    return mustache.render(ticTacToeBoard, { manager });
  });

  manager.addEventListener("ping", async (event) => {
    const { client } = event;
    const game = JSON.parse(client.get("game")!);
    if (game.every((row: string[][]) => row.every((cell) => cell === null))) {
      console.log("Game is not started", game);
      return;
    }
    console.log("🎮 Loading game state:", game);
    client.return(JSON.stringify(game));
  });

  manager.addEventListener("reset", async (event) => {
    const { client } = event;
    client.set("game", JSON.stringify(emptyGame));
    console.log("🔄 Game was reset");
  });

  manager.addEventListener("adversary-started", async (event) => {
    const { client, payload } = event;
    const { row, col, player } = payload;
    const game = JSON.parse(client.get("game")!);
    console.log("🎮 Adversary started at:", row, col);
    game[row][col] = player;
    client.set("game", JSON.stringify(game));
  });

  // Core function on move reacting on user move event
  manager.addEventListener("event", async (event) => {
    const { client, payload } = event;
    const { row, col, player } = payload;

    const game = JSON.parse(client.get("game")!); // client is guaranteed to have a game state because we have initialized it in the clientcreated event listener

    if (game[row][col] === null) {
      game[row][col] = player;
      client.set("game", JSON.stringify(game));

      const nextPlayer = player === "cross" ? "round" : "cross";
      const result = await fetchNextMove({ nextPlayer, data: game });
      if (result?.nextMove) {
        const [x, y] = result.nextMove;
        game[x][y] = nextPlayer;
        client.set("game", JSON.stringify(game));
        client.return(JSON.stringify(result));
        return;
      }
      if (result?.winner) {
        client.set("game", JSON.stringify(emptyGame));
        client.return(JSON.stringify(result));
        return;
      }
      client.return(JSON.stringify({ error: "Invalid move" }));
    }
  });

  // Function to get computer's next move from the worker
  const fetchNextMove = async (payload: {
    nextPlayer: "cross" | "round";
    data: ("cross" | "round" | null)[][];
  }): Promise<
    | {
        nextMove?: [number, number];
        winner?: "cross" | "round" | null;
      }
    | undefined
  > => {
    const { nextPlayer, data } = payload;
    try {
      const response = await manager.fetch(workerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextPlayer, data }),
      });
      if (!response) {
        throw new Error("😢 Failed to fetch next move");
      }
      const result = await response.json();
      return result;
    } catch (error) {
      console.error("😢 Error fetching next move:", error);
    }
  };
}
