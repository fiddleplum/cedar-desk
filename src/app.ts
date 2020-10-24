import { SimpleApp, WS } from 'elm-app';

export class CedarDeskApp extends SimpleApp {
	/** Constructs the app. */
	constructor() {
		super();

		this.title('Cedar Desk');

		try {
			this._ws = new WS('localhost:8081');
		}
		catch (error) {
			throw new Error(`Error connecting to web socket server: ${error.message}`);
		}
		// this._ws.getReadyPromise().then(() => {
		// 	return this._ws.send({
		// 		command: 'create user',
		// 		user: 'fiddleplum2',
		// 		password: '1234'
		// 	});
		// }).then((user) => {
		// 	console.log(user);
		// });
		this._ws.getReadyPromise().then(() => {
			return this._ws.send({
				command: 'login',
				user: 'fiddleplum2',
				password: '1234'
			});
		}).then((user) => {
			console.log(user);
		});
		// this._ws.getReadyPromise().then(() => {
		// 	return this._ws.send({
		// 		command: 'get',
		// 		table: 'users',
		// 		record: 'fiddleplum'
		// 	});
		// }).then((user) => {
		// 	console.log(user);
		// });
		// this._ws.getReadyPromise().then(() => {
		// 	return this._ws.send({
		// 		command: 'set',
		// 		table: 'users',
		// 		records: [['bob', '1234']],
		// 	});
		// }).then((user) => {
		// 	console.log(user);
		// });
	}

	/** Destructs the app. */
	destroy(): void {
		this._ws.close();
	}

	// private _checkLogin(): void {
	// 	this._ws.send({

	// 	}).then((valid) => {
	// 	});
	// }

	private _ws: WS;
}

CedarDeskApp.css = /* css */`
	body {
		background: black;
		color: white;
	}`;

CedarDeskApp.setAppClass(CedarDeskApp);

CedarDeskApp.register();
