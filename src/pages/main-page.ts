import { Page } from 'page';

export class MainPage extends Page {
	async initialize(): Promise<void> {
		// Set the title.
		this.app.setTitleHTML('Cedar Desk');
	}

	private _goToApp(id: string, _event: InputEvent): void {
		this.app.router.pushQuery({
			page: id
		}, false);
	}
}

MainPage.html = /* html */`
	<div>
		<p><button class="button" onclick="_goToApp|check-list">Check-Lists</button></p>
	</div>
	`;

MainPage.css = /* css */`
	.MainPage {
		padding: .25rem;
	}
	.MainPage p {
		text-align: center;
	}
	`;

MainPage.register();
