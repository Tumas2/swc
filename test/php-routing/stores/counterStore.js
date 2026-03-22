import { StateStore } from "swc";

import data from './counterStoreDefault.json' with { type: 'json' };

export const counterStore = new StateStore(data);
