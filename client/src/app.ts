import { SimpleApp } from 'elm-app';

export class CedarDeskApp extends SimpleApp {
	/** Constructs the app. */
	constructor() {
		super();

		this.title('Cedar Desk');
	}

	/** Destructs the app. */
	destroy(): void {
	}
}

// CedarDeskApp.html = /* html */`
// 	<div style="width: 100%; height: 100%;"></div>
// 	<div id="menu">
// 		<div id="title">
// 			Cedar Desk
// 		</div>	
// 	</div>
// 	`;

CedarDeskApp.setAppClass(CedarDeskApp);

CedarDeskApp.register();
