import { Page } from 'page';
import { Component } from 'elm-app';

export class MainPage extends Page {
	private _goToApp(component: Component): void {
		this.app.router.pushQuery({
			page: component.id
		}, false);
	}
}

MainPage.html = /* html */`
	<div>
		<PushButton id="tasks" onpress="_goToApp">Tasks</PushButton>
	</div>
	`;

MainPage.css = /* css */`
	.MainPage .PushButton {
		margin: 1rem auto;
		width: 10rem;
		border: 1px solid var(--border);
		border-radius: 1rem;
		font-size: 4rem;
		text-align: center;
	}
	`;

MainPage.register();
