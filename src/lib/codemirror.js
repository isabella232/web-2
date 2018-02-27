'use strict';

import CodeMirror from 'codemirror';
import setupEmmet from '@emmetio/codemirror-plugin';
import * as xml from 'codemirror/mode/xml/xml'; // eslint-disable-line
import * as css from 'codemirror/mode/css/css'; // eslint-disable-line
import * as htmlmixed from 'codemirror/mode/htmlmixed/htmlmixed'; // eslint-disable-line
import * as hint from 'codemirror/addon/hint/show-hint'; // eslint-disable-line
import markupAbbreviation from './markup-abbreviation-mode';

/**
 * Initially setup Emmet support & create CodeMirror instance from given `<textarea>`
 * element
 * @param {HTMLTextareaElement} textarea
 * @return {CodeMirror}
 */
export default function createEditor(textarea, options) {
	const editor = CodeMirror.fromTextArea(textarea, Object.assign({
		mode: 'text/html',
		markTagPairs: true,
		autoRenameTags: true,
		extraKeys: {
			'Ctrl-Space': 'autocomplete',
			'Tab': 'emmetExpandAbbreviation',
			'Enter': 'emmetInsertLineBreak',
			'Ctrl-W': 'emmetWrapWithAbbreviation'
		}
	}, options));

	// Automatically display Emmet completions when cursor enters abbreviation
	// marker if `markEmmetAbbreviation` option was enabled (true by default)
	editor.on('cursorActivity', () => {
		if (editor.getOption('markEmmetAbbreviation')) {
			const marker = editor.findEmmetMarker();
			if (marker && !marker.autoPopupDisabled) {
				editor.showHint({ completeSingle: false });
			}
		}
	});

	// Automatic popup with expanded Emmet abbreviation might be very annoying
	// since almost any latin word can be Emmet abbreviation.
	// So when user hides completion popup with Escape key, we should mark
	// Emmet abbreviation marker under cursor as one that shouldn’t receive
	// automatic completion popup.
	// Since CodeMirror API does not allow us (easily) to detect if completion
	// popup was hidden because of user interaction (Esc key) or because it
	// must recalculate completions on user typing, we will use a timer hack
	editor.on('startCompletion', () => {
		var marker = editor.findEmmetMarker();
		if (marker) {
			clearTimeout(marker.popupDisableTimer);
			marker.popupDisableTimer = null;
		}
	});

	editor.on('endCompletion', () => {
		var marker = editor.findEmmetMarker();
		if (marker) {
			clearTimeout(marker.popupDisableTimer);
			marker.popupDisableTimer = setTimeout(() => marker.autoPopupDisabled = true, 30);
		}
	});

	return editor;
}

setupEmmet(CodeMirror);

// Register Emmet abbreviation syntaxes
CodeMirror.defineMode('emmet-markup-abbreviation', markupAbbreviation);
CodeMirror.defineMIME('text/markup-abbreviation', 'emmet-markup-abbreviation');

// Add completions provider for CodeMirror’s `show-hint` addon
CodeMirror.registerGlobalHelper('hint', 'emmet', (mode, editor) => {
	// Tell `show-hint` module that current helper will provide completions
	return !!editor.getEmmetAbbreviation();
}, (editor) => {
	// Activate auto-popup, if disabled (see below)
	const marker = editor.findEmmetMarker();
	if (!marker) {
		return;
	}

	clearTimeout(marker.popupDisableTimer);
	marker.autoPopupDisabled = false;

	const completions = editor.getEmmetCompletions();
	return completions && {
		from: completions.from,
		to: completions.to,
		// Transform Emmet completions to ones that supported by `show-hint`
		list: completions.list.map(function (completion) {
			return {
				from: completion.range.from,
				to: completion.range.to,
				render(elt) {
					var content = document.createDocumentFragment();
					var label = document.createElement('span');
					label.className = 'emmet-label';

					var preview = document.createElement('span');
					preview.className = 'emmet-preview';

					content.appendChild(label);
					content.appendChild(preview);

					if (completion.type === 'expanded-abbreviation') {
						// It’s an expanded abbreviation completion:
						// render preview for it
						label.className += ' emmet-label__expand';
						label.textContent = 'Expand abbreviation';

						preview.className += ' emmet-preview__expand';
						// Replace tab with a few spaces so preview would take
						// lesser space
						preview.textContent = completion.preview.replace(/\t/g, '  ');
					} else {
						// A regular snippet: render completion abbreviation
						// and its preview
						label.textContent = completion.label;
						preview.textContent = completion.preview;
					}

					elt.appendChild(content);
				},
				hint: function () {
					// Use completions’ `insert()` method to properly
					// insert Emmet completion
					completion.insert();
				}
			};
		})
	};
});
