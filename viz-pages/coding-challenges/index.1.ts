import { mountGallery } from "./challenges/lib/shared.js";
import challenges from "./registry.js";

const tabs = document.querySelector<HTMLElement>("#tabs");
const main = document.querySelector<HTMLElement>("#main");
if (!tabs || !main) throw new Error("coding-challenges: #tabs / #main missing from index.html");
mountGallery(challenges, tabs, main);
