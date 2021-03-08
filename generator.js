// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const MarkdownIt = require('markdown-it');

const { HTMLPage } = require('./mdnPage.js');
// const { InterfaceSet } = require('mdn-helper/interfaceset.js')
// const { InterfaceCollection } = require('mdn-helper/interfacecollection.js');
const { Finder } = require('mdn-helper/finder.js');
const { SourcePage } = require('./sourcePage.js');
const { COMPAT_TABLE, HEADER_MACROS, SPEC_TABLE } = require('./utils.js');

const IN = `content/en-US/api/`;

const mi = MarkdownIt({ html: true, linkify: true });

class _Generator {
  constructor(source) {
    this._sourcePage = new SourcePage(`${IN}${source}`);
    // const interfaces = new InterfaceCollection();
    // this._IDL = interfaces.findExact(this._sourcePage.title, true, true);
    const finder = new Finder(['Finder', this._sourcePage.title, '-f', '-o']);
    this._IDL = finder.findAndReturn();
    this._mdnPages = [];
    this._interfaceName = source.split('.md')[0];
  }

  generate() {
    this._makeInterface();
    this._makeConstructor();
    this._makeEvents();
    this._makeMethods();
    this._makeProperties();
    this._replaceVariable('[[shared:interface]]', this._interfaceName);
    this._writeContent();
  }

  _replaceVariable(variable, value) {
    for (let m of this._mdnPages) {
      m.replaceString(variable, value);
    }
  }

  _writeContent() {
    for (let m of this._mdnPages) {
      m.write();
    }
    const writePath = this._mdnPages[0].mdnDirPath;
    const msg = `\nNew files written to:\n\t${writePath}`;
    console.log(msg);
  }

  _makeInterface() {
    let interfaceText = this._sourcePage.interfaceText;
    interfaceText = this.stripReaderComments(interfaceText);
    interfaceText = mi.render(interfaceText);
    interfaceText = interfaceText.replace('---<', `---\n${HEADER_MACROS}\n\n<`);
    const interfacePage = new HTMLPage(this._interfaceName, 'interface');
    interfacePage.replaceContent(interfaceText);
    interfacePage.append(SPEC_TABLE);
    interfacePage.append(COMPAT_TABLE);
    const newLink = `#dom-${this._interfaceName.toLowerCase()}`
    interfacePage.replaceString(`[[memberLink]]`, newLink);
    this._mdnPages.push(interfacePage);
  }

  _makeConstructor() {
    let constructorText = this._sourcePage.constructorText;
    if (!constructorText) { return; }
    constructorText = `<p class="summary">${constructorText}</p>`
    constructorText = mi.render(constructorText);
    const constructorPage = new HTMLPage(this._interfaceName, 'constructor');
    constructorPage.inject(constructorText, 'Summary');
    const newLink = `#dom-${this._interfaceName.toLowerCase()}-constructor`;
    constructorPage.replaceString(`[[memberLink]]`, newLink);
    this._mdnPages.push(constructorPage);
  }

  _makeEvents() {
    let eventText = this._sourcePage.events;
    if (!eventText) { return; }
    const newPages = this._renderList(eventText, 'EventHandler');
    this._mdnPages.push(...newPages);
  }

  _makeMethods() {
    let methodText = this._sourcePage.methods;
    if (!methodText) { return; }
    const newPages = this._renderList(methodText, 'method');
    this._mdnPages.push(...newPages);
  }

  _makeProperties() {
    let propertyText = this._sourcePage.properties;
    if (!propertyText) { return; }
    const newPages = this._renderList(propertyText, 'property');
    this._mdnPages.push(...newPages);
  }

  _renderList(listText, type) {
    let newMDNPage;
    let newMDNPages = [];
    const memberList = this._splitList(listText);
    for (let m of memberList) {
      newMDNPage = new HTMLPage(m[0], type.toLowerCase());
      m[1] = mi.render(m[1]);
      newMDNPage.inject(m[1], 'Summary');
      newMDNPage.replaceString(`[[${type}]]`, newMDNPage.shortName);
      const newLink = `#dom-${this._interfaceName.toLowerCase()}-${newMDNPage.shortName.toLowerCase()}`
      newMDNPage.replaceString(`[[memberLink]]`, newLink);
      newMDNPages.push(newMDNPage);
    }
    return newMDNPages;
  }

  _splitList(sourceText) {
    let newList = [];
    for (let s in sourceText) {
      if (sourceText[s].includes('`**')) {
        let sourceLines = sourceText[s].split('`**');
        sourceLines[1] = sourceLines[1].replace('\n', '').trim();
        newList.push(sourceLines);
      }
    }
    return newList;
  }

  stripReaderComments(content) {
    const SHIPPING_NOTICE = /\*\*When this feature ships[^*]*\*\*/;
    return content.replace(SHIPPING_NOTICE, '');
  }

}

module.exports.Generator = _Generator;