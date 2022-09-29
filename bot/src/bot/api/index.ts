import { Router } from "restify-router"
import {
  UspGetWorkplaceTeam,
  UspGetTeam,
  UspGetStore,
  UspGetTag,
  UspSetTag,
  UspDeleteTag,
} from "./query"

export const routerInstance = new Router();

routerInstance.get('/getWorkplace', async (req, res) => {
  const row = await UspGetWorkplaceTeam(req.query["startDate"], req.query["endDate"], req.query["team"]);
  res.json(row);
});

routerInstance.get('/getTeam', async (req, res) => {
  const row = await UspGetTeam(req.query["UPN"]);
  res.json(row);
});

routerInstance.get('/getStore', async (req, res) => {
  const row = await UspGetStore(req.query["search"]);
  res.json(row);
});

routerInstance.get('/tag', async (req, res) => {
  const row = await UspGetTag(Number(req.query["storeId"]));
  res.json(row);
});

routerInstance.post('/tag', async (req, res) => {
  const row = await UspSetTag(Number(req.body["storeId"]), req.body["tag"]);
  res.json(row);
});

routerInstance.del('/tag', async (req, res) => {
  const row = await UspDeleteTag(Number(req.query["storeId"]), req.query["tag"]);
  res.json(row);
});