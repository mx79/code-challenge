export default {
	async fetch(request, env, ctx): Promise<Response> {
		if (request.method === 'POST') {
			try {
				const object: { nextPlayer: 'cross' | 'round'; data: ('cross' | 'round' | null)[][] } = await request.json();
				const { nextPlayer, data } = object;

				if (nextPlayer !== 'cross' && nextPlayer !== 'round') {
					return new Response('Invalid player', { status: 400 });
				}

				if (!isValidBoard(data)) {
					return new Response('Invalid board data', { status: 400 });
				}

				// Check for a player winner
				const winnerPlayer = checkWinner(data);
				if (winnerPlayer) {
					return new Response(JSON.stringify({ winner: winnerPlayer }), {
						headers: { 'Content-Type': 'application/json' },
						status: 200,
					});
				}

				// Get the next move
				const nextMove = getRandomMove(data);
				if (!nextMove) {
					return new Response(JSON.stringify({ winner: 'draw' }), { status: 200 });
				}

				// Update the data with the next move
				const [nextX, nextY] = nextMove;

				// Update the board with the next move
				data[nextX][nextY] = nextPlayer;

				// Check if the robot's move resulted in a win
				const winnerRobot = checkWinner(data);
				if (winnerRobot) {
					return new Response(JSON.stringify({ nextMove, winner: winnerRobot }), {
						headers: { 'Content-Type': 'application/json' },
						status: 200,
					});
				}

				// Return the next move without a winner
				return new Response(JSON.stringify({ nextMove }), {
					headers: { 'Content-Type': 'application/json' },
					status: 200,
				});
			} catch (error) {
				console.error(error);
				return new Response('Error while processing', { status: 500 });
			}
		} else {
			return new Response('Unauthorized method', { status: 405 });
		}
	},
} satisfies ExportedHandler<Env>;

/**
 * Validate if the board structure is correct
 *
 * @param {("cross" | "round" | null)[][]} board
 * @returns {boolean} Whether the board is valid or not
 */
function isValidBoard(board: ('cross' | 'round' | null)[][]): boolean {
	if (!Array.isArray(board) || board.length !== 3 || board.some((row) => row.length !== 3)) {
		return false;
	}

	for (const row of board) {
		for (const cell of row) {
			if (cell !== 'cross' && cell !== 'round' && cell !== null) {
				return false;
			}
		}
	}

	return true;
}

/**
 * Check if there's a winner in the board
 *
 * @param {("cross" | "round" | null)[][]} board
 * @returns {string | null} The winner or null if no one has won yet
 */
function checkWinner(board: ('cross' | 'round' | null)[][]): 'cross' | 'round' | 'draw' | null {
	const lines: ('cross' | 'round' | null)[][] = [
		// Lines
		[board[0][0], board[0][1], board[0][2]],
		[board[1][0], board[1][1], board[1][2]],
		[board[2][0], board[2][1], board[2][2]],
		// Columns
		[board[0][0], board[1][0], board[2][0]],
		[board[0][1], board[1][1], board[2][1]],
		[board[0][2], board[1][2], board[2][2]],
		// Diagonals
		[board[0][0], board[1][1], board[2][2]],
		[board[2][0], board[1][1], board[0][2]],
	];

	for (const line of lines) {
		if (line[0] && line[0] === line[1] && line[0] === line[2]) {
			return line[0];
		}
	}

	if (board.every((row) => row.every((cell) => cell !== null))) {
		return 'draw';
	}

	return null;
}

/**
 * Get a random move by picking a random available move if any in the board
 *
 * @param {("cross" | "round" | null)[][]} board
 * @returns {Array<number> | null} The next move or null if there
 */
function getRandomMove(board: ('cross' | 'round' | null)[][]): [number, number] | null {
	const availableMoves: [number, number][] = [];

	for (let x = 0; x < 3; x++) {
		for (let y = 0; y < 3; y++) {
			if (board[x][y] === null) {
				availableMoves.push([x, y]);
			}
		}
	}

	if (availableMoves.length > 0) {
		return availableMoves[Math.floor(Math.random() * availableMoves.length)];
	}

	return null;
}
