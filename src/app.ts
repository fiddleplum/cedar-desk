import { SimpleApp, WS } from 'elm-app';

export class CedarDeskApp extends SimpleApp {
	/** Constructs the app. */
	constructor() {
		super();

		console.log('here');

		this.title('Cedar Desk');

		this._ws = new WS('localhost:8081');
		this._ws.getReadyPromise().then(() => {
			this._ws.send({
				test: 'test2'
			});
		});
	}

	/** Destructs the app. */
	destroy(): void {
	}

	private _ws: WS;
}

// CedarDeskApp.html = /* html */`
// 	<div style="width: 100%; height: 100%;"></div>
// 	<div id="menu">
// 		<div id="title">
// 			Cedar Desk
// 		</div>
// 	</div>
// 	`;

CedarDeskApp.css = /* css */`
	body {
		background: black;
		color: white;
	}`;

CedarDeskApp.setAppClass(CedarDeskApp);

CedarDeskApp.register();
