import { Page } from 'page';
import { ToggleButton, ElmCheckbox, ShowHide, Form } from 'elm-app';
import { RandomString } from 'pine-lib';
import { SunAlarm } from 'types/sun-alarm';

export class SunAlarmAddEditPage extends Page {
	async initialize(): Promise<void> {
		// Set the title.
		this.app.setTitleHTML('Sun Alarm');

		this._alarmId = this.app.router.getValue('id');
		if (this._alarmId !== undefined) {
			this.element('title', Element).innerHTML = 'Edit Alarm';
			this.element('submit', Element).innerHTML = 'Update Alarm';

			// Disable everything until we get a result.
			this.element('form', HTMLElement).classList.add('hidden');
			// Fill in the inputs.
			this.app.ws.send({
				module: 'sun-alarm',
				command: 'get',
				params: {
					id: this._alarmId
				}
			}).then((sunAlarm: SunAlarm) => {
				if (sunAlarm.relativeTo === 'sunset') {
					this.element('relativeTo-sunset', HTMLInputElement).checked = true;
				}
				// Enable everything once we get the result.
				this.element('form', HTMLElement).classList.remove('hidden');
			});
		}
	}

	private _toggleAngleHelp(): void {
		ShowHide.toggle(this.element('angle-help', HTMLDivElement));
	}

	private _submit(): void {
		const inputs = Form.getInputs(this.root);

		// Get the angle offset.
		let angleOffset: number = 0;
		try {
			angleOffset = Number.parseFloat(inputs.angleOffset as string);
		}
		catch {
			this.element('message', HTMLParagraphElement).innerHTML = 'The angle offset must be a number.';
			return;
		}
		if (inputs.angleSign === 'below') {
			angleOffset *= -1;
		}

		// Get the time offset.
		let timeOffset: number = 0;
		try {
			const hours = Number.parseInt((inputs.timeOffset as string).substring(0, 2));
			const minutes = Number.parseInt((inputs.timeOffset as string).substring(3, 5));
			timeOffset = hours * 60 + minutes;
		}
		catch {
			this.element('message', HTMLParagraphElement).innerHTML = 'The time offset must in the format HH:MM.';
			return;
		}
		if (inputs.timeSign === 'before') {
			timeOffset *= -1;
		}

		// Get the days of the week.
		const days: boolean[] = [];
		for (let i = 0; i < 7; i++) {
			days.push(inputs[`day${i}`] as boolean);
		}

		// Add the alarm.
		this.app.ws.send({
			module: 'sun-alarm',
			command: 'update',
			params: {
				id: this._alarmId ?? RandomString.generate(12),
				relativeTo: inputs.relativeTo,
				angleOffset: angleOffset,
				timeOffset: timeOffset,
				sound: inputs.sound,
				days: days,
				enabled: true
			}
		}).then(() => {
			this._goToAlarmList();
		});
	}

	private _goToAlarmList(): void {
		this.app.router.pushQuery({
			page: 'sun-alarm'
		});
	}

	private _alarmId: string | undefined = undefined;
}

SunAlarmAddEditPage.html = /* html */`
	<div>
		<button onclick="_goToAlarmList" style="float: right">Back</button>
		<h1 id="title">Add Alarm</h1>
		<div id="form">
			<p class="ask">Should the time of the alarm be relative to sunrise or sunset?</p>
			<p class="input">
				<input id="relativeTo-sunrise" type="radio" name="relativeTo" value="sunrise" checked />
				<label for="relativeTo-sunrise">Sunrise</label>
				<input id="relativeTo-sunset" type="radio" name="relativeTo" value="sunset" />
				<label for="relativeTo-sunset">Sunset</label>
			</p>
			<p class="ask">At what angle above or below the horizon (degrees)?</p>
			<p class="input">
				<input name="angleOffset" style="width: 4rem;" value="0" />
				<select name="angleSign">
					<option value="below" default>below</option>
					<option value="above">above</option>
				</select>
				<elmcheckbox id="angle-help-button" ontoggle="_toggleAngleHelp">?</elmcheckbox>
			</p>
			<div id="angle-help" class="popup2" style="display: none;">
				<p>When the sun is right at the horizon, it is at 0 degrees.</p>
				<p>Use negative numbers for angles below the horizon and positive numbers for angles above the horizon.</p>
				<p><img src="assets/images/angle-help.svg"></img></p>
				<p style="font-size: .5rem;">Courtesy Wikipedia</p>
			</div>
			<p class="ask">How much time before or after the sun reaches this angle (HH:MM)?</p>
			<p class="input">
				<input name="timeOffset" style="width: 6rem;" value="00:00" />
				<select name="timeSign">
					<option value="before" default>before</option>
					<option value="after">after</option>
				</select>
			</p>
			<p class="ask">Choose an alarm:</p>
			<p class="input">
				<select name="sound">
					<option value="beep" default>Beep</option>
					<option value="rooster">Rooster Crow</option>
					<option value="lulluby" default>Lulluby</option>
				</select>
			</p>
			<p class="ask">On what days should it happen?</p>
			<p id="days" class="input">
				<elmcheckbox id="day0" checked>M</elmcheckbox>
				<elmcheckbox id="day1" checked>T</elmcheckbox>
				<elmcheckbox id="day2" checked>W</elmcheckbox>
				<elmcheckbox id="day3" checked>T</elmcheckbox>
				<elmcheckbox id="day4" checked>F</elmcheckbox>
				<elmcheckbox id="day5">S</elmcheckbox>
				<elmcheckbox id="day6">S</elmcheckbox>
			</p>
			<p class="ask"><button id="submit" onclick="_submit" class="fullwidth">Add</button></p>
			<p id="message"></p>
		</div>
	</div>
	`;

SunAlarmAddEditPage.css = /* css */`
	.SunAlarmAddEditPage {
		margin: 0 auto;
		width: 100%;
		max-width: 20rem;
	}
	p.ask {
		margin-top: 1rem;
	}
	p.input {
	}
	label, input, select {
		margin-right: .5rem;
	}
	#days label {
		width: 1.5rem;
		text-align: center;
		padding: 0;
	}
`;

SunAlarmAddEditPage.register();
