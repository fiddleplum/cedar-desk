import { CedarDeskApp } from './app';
import { SimpleApp } from 'elm-app';

export class Page extends SimpleApp.Page {
	/** Gets the CedarApp. */
	get app(): CedarDeskApp {
		return this._app!;
	}

	/** Sets the app for the page. Only should be called by CedarApp itself. */
	setApp(cedarDeskApp: CedarDeskApp): void {
		this._app = cedarDeskApp;
	}

	/** The CedarApp. */
	private _app: CedarDeskApp | undefined;
}
