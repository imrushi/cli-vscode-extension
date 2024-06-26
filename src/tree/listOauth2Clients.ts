import * as vscode from 'vscode';
import { spawn } from 'child_process';
import { oryCommand } from '../extension';
import { spawnCommonErrAndClose } from '../helper';
import { oryDeleteOauth2Client } from '../oryDelete';
import { logger } from '../helper/logger';

export interface Oauth2Clients {
  clientID: string;
  clientSecret: string;
  grantTypes: string[];
  responseType: string[];
  scope: string;
  audience: string[];
  redirectUris: string[];
  name: string;
}

export class ListOauth2ClientsProvider implements vscode.TreeDataProvider<Oauth2ClientsTreeItem> {
  private topLevelItems: Oauth2ClientsTreeItem[] = [];
  private _onDidChangeTreeData: vscode.EventEmitter<
    Oauth2ClientsTreeItem | Oauth2ClientsTreeItem[] | undefined | void
  > = new vscode.EventEmitter<Oauth2ClientsTreeItem | Oauth2ClientsTreeItem[] | undefined | void>();
  readonly onDidChangeTreeData?:
    | vscode.Event<void | Oauth2ClientsTreeItem | Oauth2ClientsTreeItem[] | null | undefined>
    | undefined = this._onDidChangeTreeData.event;

  constructor() {
    this.init();
  }

  async init() {
    logger.info('Fetching Oauth2 Clients...', 'list-oauth2-clients');
    const oauth2Clients = await runOryListOauth2Clients().catch((err) => {
      console.error(err);
      logger.error(`Error: ${err.message}`, 'list-oauth2-clients');
      return [];
    });

    this.topLevelItems = oauth2Clients.items.map((oauth2: any) => {
      return new Oauth2ClientsTreeItem({
        name: oauth2.client_name,
        clientID: oauth2.client_id,
        clientSecret: oauth2.client_secret === undefined ? '' : oauth2.client_secret,
        audience: oauth2.audience,
        grantTypes: oauth2.grant_types,
        redirectUris: oauth2.redirect_uris,
        responseType: oauth2.response_types,
        scope: oauth2.scope
      });
    });
    logger.info('Fetched Oauth2 Clients', 'list-oauth2-clients');
    this._onDidChangeTreeData.fire();
  }

  async refresh() {
    logger.info('Refreshing Oauth2 Clients...', 'list-oauth2-clients');
    this.topLevelItems = [];
    this.init();
    logger.info('Refreshed Oauth2 Clients', 'list-oauth2-clients');
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: Oauth2ClientsTreeItem): vscode.TreeItem | Thenable<vscode.TreeItem> {
    return element;
  }

  getChildren(element?: Oauth2ClientsTreeItem | undefined): vscode.ProviderResult<Oauth2ClientsTreeItem[]> {
    if (element === undefined) {
      return this.topLevelItems;
    }
    return [];
  }

  async delete(id: string) {
    const val = await oryDeleteOauth2Client([id]);
    if (val.includes(id)) {
      const index = this.topLevelItems.findIndex((item) => item.clientID === id);
      if (index !== -1) {
        this.topLevelItems.splice(index, 1);
        this._onDidChangeTreeData.fire();
      }
    }
  }
}

export class Oauth2ClientsTreeItem extends vscode.TreeItem {
  private readonly _item: Oauth2Clients;
  constructor(public readonly oauth2: Oauth2Clients) {
    super(oauth2.name !== '' ? oauth2.name : oauth2.clientID, vscode.TreeItemCollapsibleState.None);

    this.tooltip = `ClientID: ${oauth2.clientID}\nClientSecret: ${oauth2.clientSecret}\nGrant Types: ${oauth2.grantTypes}\nScope: ${oauth2.scope}\nAudience: ${oauth2.audience}\nRedirect URIS: ${oauth2.redirectUris}\nResponse Type: ${oauth2.responseType}`;
    this.iconPath = this.getIconPath(oauth2.clientID);
    this._item = this.oauth2;
    this.contextValue = 'oauth2Clients';
  }

  private getIconPath(clientID: string): vscode.ThemeIcon | undefined {
    let icon: vscode.ThemeIcon;
    switch (clientID) {
      case '':
        icon = new vscode.ThemeIcon('repo');
        break;
      default:
        icon = new vscode.ThemeIcon('plug', new vscode.ThemeColor('debugIcon.startForeground'));
        break;
    }
    return icon;
  }

  public get clientID(): string {
    return this._item.clientID;
  }

  public get clientSecret(): string {
    return this._item.clientSecret;
  }
}

export async function runOryListOauth2Clients(): Promise<any> {
  let oauth2ClientsOutputFormat: string = 'json';
  let json: any;

  const listOauth2Clients = spawn(oryCommand, ['list', 'oauth2-clients', '--format', `${oauth2ClientsOutputFormat}`]);
  await spawnCommonErrAndClose(listOauth2Clients, 'Oauth2Clients').then((value) => {
    json = JSON.parse(value);
  });
  return json;
}
