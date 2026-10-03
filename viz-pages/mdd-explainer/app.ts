import { $, $$, saveHash, loadHash } from "/_kit/viz.js";

/* ---------- brand marks ----------
   Single-path marks from the Simple Icons collection (CC0), plus DeepEval's own
   glyph from its repo. Arize Phoenix publishes only a 20-path gradient bird and
   Ragas publishes no vector at all, so those two get a letterform tile in the
   same slot at the same weight — a row where five chips have a logo and two have
   a blank reads as broken, where a consistent mark reads as a design.
   Tints are picked for this dark panel: the official hex for Anthropic, Java and
   OpenAI is near-black and would vanish. */
interface Logo { vb?: string; d?: string[]; c?: string; img?: string }
interface Hash { persona: string; sample: string; tool: string; metric: string }
const LOGOS: Record<string, Logo> = {"python":{"vb":"0 0 24 24","d":["M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.77l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.17l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05-.05-1.23.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.18l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09zm13.09 3.95l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.01zm-6.47 14.25l-.23.33-.08.41.08.41.23.33.33.23.41.08.41-.08.33-.23.23-.33.08-.41-.08-.41-.23-.33-.33-.23-.41-.08-.41.08z"],"c":"#5A9FD4"},"java":{"vb":"0 0 24 24","d":["M8.851 18.56s-.917.534.653.714c1.902.218 2.874.187 4.969-.211 0 0 .552.346 1.321.646-4.699 2.013-10.633-.118-6.943-1.149M8.276 15.933s-1.028.761.542.924c2.032.209 3.636.227 6.413-.308 0 0 .384.389.987.602-5.679 1.661-12.007.13-7.942-1.218M13.116 11.475c1.158 1.333-.304 2.533-.304 2.533s2.939-1.518 1.589-3.418c-1.261-1.772-2.228-2.652 3.007-5.688 0-.001-8.216 2.051-4.292 6.573M19.33 20.504s.679.559-.747.991c-2.712.822-11.288 1.069-13.669.033-.856-.373.75-.89 1.254-.998.527-.114.828-.093.828-.093-.953-.671-6.156 1.317-2.643 1.887 9.58 1.553 17.462-.7 14.977-1.82M9.292 13.21s-4.362 1.036-1.544 1.412c1.189.159 3.561.123 5.77-.062 1.806-.152 3.618-.477 3.618-.477s-.637.272-1.098.587c-4.429 1.165-12.986.623-10.522-.568 2.082-1.006 3.776-.892 3.776-.892M17.116 17.584c4.503-2.34 2.421-4.589.968-4.285-.355.074-.515.138-.515.138s.132-.207.385-.297c2.875-1.011 5.086 2.981-.928 4.562 0-.001.07-.062.09-.118M14.401 0s2.494 2.494-2.365 6.33c-3.896 3.077-.888 4.832-.001 6.836-2.274-2.053-3.943-3.858-2.824-5.539 1.644-2.469 6.197-3.665 5.19-7.627M9.734 23.924c4.322.277 10.959-.153 11.116-2.198 0 0-.302.775-3.572 1.391-3.688.694-8.239.613-10.937.168 0-.001.553.457 3.393.639"],"c":"#E76F00"},"javascript":{"vb":"0 0 24 24","d":["M0 0h24v24H0V0zm22.034 18.276c-.175-1.095-.888-2.015-3.003-2.873-.736-.345-1.554-.585-1.797-1.14-.091-.33-.105-.51-.046-.705.15-.646.915-.84 1.515-.66.39.12.75.42.976.9 1.034-.676 1.034-.676 1.755-1.125-.27-.42-.404-.601-.586-.78-.63-.705-1.469-1.065-2.834-1.034l-.705.089c-.676.165-1.32.525-1.71 1.005-1.14 1.291-.811 3.541.569 4.471 1.365 1.02 3.361 1.244 3.616 2.205.24 1.17-.87 1.545-1.966 1.41-.811-.18-1.26-.586-1.755-1.336l-1.83 1.051c.21.48.45.689.81 1.109 1.74 1.756 6.09 1.666 6.871-1.004.029-.09.24-.705.074-1.65l.046.067zm-8.983-7.245h-2.248c0 1.938-.009 3.864-.009 5.805 0 1.232.063 2.363-.138 2.711-.33.689-1.18.601-1.566.48-.396-.196-.597-.466-.83-.855-.063-.105-.11-.196-.127-.196l-1.825 1.125c.305.63.75 1.172 1.324 1.517.855.51 2.004.675 3.207.405.783-.226 1.458-.691 1.811-1.411.51-.93.402-2.07.397-3.346.012-2.054 0-4.109 0-6.179l.004-.056z"],"c":"#F7DF1E"},"typescript":{"vb":"0 0 24 24","d":["M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 0 1 1.306.34v2.458a3.95 3.95 0 0 0-.643-.361 5.093 5.093 0 0 0-.717-.26 5.453 5.453 0 0 0-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 0 0-.623.242c-.17.104-.3.229-.393.374a.888.888 0 0 0-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 0 1-1.012 1.085 4.38 4.38 0 0 1-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 0 1-1.84-.164 5.544 5.544 0 0 1-1.512-.493v-2.63a5.033 5.033 0 0 0 3.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 0 0-.074-1.089 2.12 2.12 0 0 0-.537-.5 5.597 5.597 0 0 0-.807-.444 27.72 27.72 0 0 0-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 0 1 1.47-.629 7.536 7.536 0 0 1 1.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"],"c":"#4A9EE8"},"dotnet":{"vb":"0 0 24 24","d":["M24 8.77h-2.468v7.565h-1.425V8.77h-2.462V7.53H24zm-6.852 7.565h-4.821V7.53h4.63v1.24h-3.205v2.494h2.953v1.234h-2.953v2.604h3.396zm-6.708 0H8.882L4.78 9.863a2.896 2.896 0 0 1-.258-.51h-.036c.032.189.048.592.048 1.21v5.772H3.157V7.53h1.659l3.965 6.32c.167.261.275.442.323.54h.024c-.04-.233-.06-.629-.06-1.185V7.529h1.372zm-8.703-.693a.868.829 0 0 1-.869.829.868.829 0 0 1-.868-.83.868.829 0 0 1 .868-.828.868.829 0 0 1 .869.829Z"],"c":"#8B6FF0"},"openai":{"vb":"0 0 24 24","d":["M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z"],"c":"#E9E9EC"},"anthropic":{"vb":"0 0 24 24","d":["M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.5409Zm-.3712 10.2232 2.2914-5.9456 2.2914 5.9456Z"],"c":"#D97757"},"langchain":{"vb":"0 0 24 24","d":["M13.796 0a6.93 6.93 0 0 0-4.91 2.019L5.451 5.455l3.273 3.27 3.432-3.432a2.284 2.284 0 0 1 3.277 0 2.28 2.28 0 0 1 0 3.275L12 12.001l3.273 3.273 3.433-3.435c2.692-2.692 2.692-7.127 0-9.82A6.92 6.92 0 0 0 13.796 0m-5.07 8.728-3.433 3.434c-2.692 2.693-2.692 7.126 0 9.819A6.92 6.92 0 0 0 10.203 24a6.93 6.93 0 0 0 4.911-2.02l3.432-3.432-3.271-3.272-3.433 3.433a2.284 2.284 0 0 1-3.277 0 2.28 2.28 0 0 1 0-3.276L12 12z"],"c":"#7FC8FF"},"deepeval":{"vb":"14 14 114 112","d":["M71.704 43.7C75.5487 43.7 78.9457 44.4373 81.895 45.912C84.8443 47.334 87.2933 49.3353 89.242 51.916C91.2433 54.444 92.7443 57.3933 93.745 60.764C94.7457 64.082 95.246 67.6107 95.246 71.35C95.246 76.4587 94.3507 81.1197 92.56 85.333C90.7693 89.4937 88.136 92.8117 84.66 95.287C81.184 97.7623 76.8653 99 71.704 99H52.428C51.322 99 50.374 98.6313 49.584 97.894C48.794 97.104 48.399 96.1297 48.399 94.971V47.729C48.399 46.5703 48.794 45.6223 49.584 44.885C50.374 44.095 51.322 43.7 52.428 43.7H71.704ZM70.914 91.416C74.6533 91.416 77.6817 90.4943 79.999 88.651C82.3163 86.8077 84.0017 84.385 85.055 81.383C86.161 78.3283 86.714 74.984 86.714 71.35C86.714 68.664 86.398 66.136 85.766 63.766C85.1867 61.3433 84.2387 59.2103 82.922 57.367C81.658 55.471 80.0253 53.9963 78.024 52.943C76.0753 51.837 73.7053 51.284 70.914 51.284H55.983L56.694 50.573V92.206L56.22 91.416H70.914Z","M107.082 98.921C105.765 98.921 104.738 98.5523 104.001 97.815C103.316 97.0777 102.974 96.0507 102.974 94.734V93.312C102.974 91.9953 103.316 90.9683 104.001 90.231C104.738 89.4937 105.765 89.125 107.082 89.125H107.951C109.267 89.125 110.268 89.4937 110.953 90.231C111.637 90.9683 111.98 91.9953 111.98 93.312V94.734C111.98 96.0507 111.637 97.0777 110.953 97.815C110.268 98.5523 109.267 98.921 107.951 98.921H107.082Z"],"c":"#8B5CFF"}};
LOGOS["phoenix"] = {"vb":"0 0 25 25","d":["M22.8399 15.4191C22.7784 15.1418 22.6379 14.8865 22.4209 14.6602C22.3373 14.5732 22.2445 14.4908 22.1435 14.4166C22.0948 14.3806 22.0426 14.3469 21.9892 14.3133C21.923 14.2715 21.8545 14.2321 21.7791 14.1938C21.5029 14.0522 21.2673 13.9095 21.0607 13.7563C20.9771 13.6948 20.8959 13.6298 20.8193 13.5637C20.6348 13.4024 20.5106 13.2643 20.4177 13.1181C20.3876 13.0717 20.3609 13.0206 20.3353 12.9719C20.3249 12.951 20.3086 12.9336 20.2901 12.9197C20.2564 12.8953 20.2135 12.8849 20.1705 12.8918C20.1044 12.9046 20.0533 12.958 20.0452 13.0253C20.0394 13.0775 20.0394 13.1332 20.0464 13.19C20.051 13.2237 20.0324 13.2562 20.0011 13.2701C19.9941 13.2736 19.986 13.2747 19.979 13.2759C19.9349 13.2805 19.8955 13.3049 19.8699 13.342C19.8444 13.3792 19.8374 13.4244 19.8479 13.4674C19.8572 13.5045 19.8699 13.5312 19.8804 13.5521L19.8897 13.5706C19.8966 13.5834 19.9036 13.5973 19.9106 13.6101C19.9315 13.6495 19.9523 13.689 19.9779 13.7261C20.0266 13.7969 20.0812 13.8677 20.1462 13.9431C20.1671 13.9675 20.1705 14.0023 20.1554 14.0301C20.1404 14.058 20.109 14.0742 20.0777 14.0696C19.7121 14.0197 19.3837 13.9373 19.0784 13.8248C19.0436 13.812 19.0076 13.7992 18.974 13.7853C18.7001 13.6693 19.1945 13.1773 19.4208 12.828C20.4131 11.3021 20.6185 9.55457 20.6266 7.78616C20.6348 6.07692 20.4502 4.3909 20.1102 2.72691V2.72459C19.8885 1.32982 19.7005 0.80649 19.5821 0.612707C19.5566 0.561651 19.5287 0.52916 19.4997 0.514075C19.4672 0.492028 19.4498 0.502472 19.4498 0.502472C19.386 0.504792 19.3129 0.561651 19.2247 0.653321C18.8544 1.04205 18.8753 1.50504 18.9775 1.98891C19.4452 4.18667 19.7968 6.39719 19.6367 8.65528C19.5264 10.2125 19.2363 11.7117 18.1476 12.9313C18.0826 13.0044 18.0118 13.0728 17.941 13.1425C17.8598 13.2225 17.7333 13.378 17.6393 13.313C17.514 13.226 17.6254 13.0473 17.6648 12.9545C18.302 11.4611 18.4854 9.90037 18.3879 8.29208C18.3856 8.25495 18.3821 8.21782 18.3797 8.18069V8.17837C18.3786 8.1482 18.3751 8.12035 18.3728 8.09134C18.3565 7.87783 18.3368 7.66664 18.3101 7.45545C18.0362 4.90378 17.7066 4.73785 17.7066 4.73785C17.6846 4.71812 17.6579 4.70304 17.6219 4.69607C17.449 4.6601 17.355 4.81211 17.2784 4.92699C16.9325 5.44452 17.0857 5.9957 17.1971 6.54107C17.5882 8.45105 17.594 10.3436 16.9232 12.2014C16.8617 12.3708 16.7886 12.5356 16.7108 12.698C16.6284 12.8709 16.575 13.0868 16.2942 12.9939C16.0307 12.9069 16.105 12.7073 16.1387 12.5251C16.2269 12.0621 16.2977 11.598 16.3418 11.1327V11.135C16.3476 11.0886 16.3499 11.0445 16.3534 11.0004C16.3603 10.9203 16.365 10.8391 16.3696 10.759C16.3731 10.6917 16.3766 10.6256 16.3801 10.5606C16.3812 10.527 16.3835 10.4945 16.3835 10.4608C16.4369 8.98599 16.1886 8.31529 16.0946 8.11687C16.0841 8.0925 16.0725 8.07045 16.0597 8.05072C15.9623 7.90452 15.8009 7.92192 15.6617 8.06001C15.4052 8.31297 15.2636 8.61235 15.3286 8.98947C15.5189 10.0872 15.4075 11.1745 15.2032 12.2559C15.1754 12.401 15.1104 12.6655 14.8005 12.5971C14.5893 12.5507 14.5405 12.4602 14.5289 12.2768C14.5312 12.1387 14.5289 12.0006 14.5243 11.8626C14.5243 11.8591 14.5243 11.8556 14.5243 11.8521C14.5243 11.8324 14.522 11.8127 14.522 11.7941C14.522 11.7837 14.5208 11.7744 14.5196 11.7651C14.5104 11.5771 14.4953 11.388 14.4721 11.1988C14.4697 11.1803 14.4663 11.1629 14.4639 11.1443C14.3456 10.0791 14.1912 9.97579 14.1912 9.97579C14.0925 9.84699 13.9382 9.86903 13.8047 10.0013C13.5482 10.2543 13.4182 10.5525 13.4716 10.9308C13.5111 11.207 13.5007 11.1222 13.5285 11.3636C13.5506 11.4878 13.5738 11.714 13.5761 11.786C13.5703 11.8498 13.554 11.9055 13.5146 11.9473C13.3834 12.0877 13.1722 11.9438 13.012 11.8776C9.90632 10.5931 7.24858 8.78988 4.92857 6.50858C4.01403 5.5768 2.46 3.69583 2.46 3.69583C2.40197 3.62853 2.33002 3.59023 2.21976 3.63781C2.01666 3.72484 2.02246 3.98476 2.00389 4.20291C1.96675 4.64038 2.20119 4.95716 2.45536 5.25422C5.95917 9.34106 10.2348 12.278 15.3959 13.747L16.3244 13.993C16.3348 13.9953 16.3464 13.9988 16.3568 14.0011C16.3592 14.0011 16.3615 14.0023 16.3615 14.0023L17.1611 14.2146L17.1832 14.2204C17.1565 14.2286 17.1275 14.2344 17.0961 14.2402C16.2164 14.4142 14.4755 14.094 13.077 13.7679C12.3853 13.6229 11.7052 13.4465 11.0402 13.2364C11.01 13.2272 10.9926 13.2225 10.9926 13.2225C8.40916 12.3998 6.04273 11.0665 3.97225 9.03356C3.77611 8.84094 3.59506 8.63323 3.41633 8.42321C3.25268 8.22826 2.91495 7.82097 2.79773 7.68056C2.78497 7.662 2.77104 7.64575 2.75711 7.63067C2.7223 7.5947 2.67935 7.57149 2.61784 7.58541C2.47393 7.61906 2.43215 7.76759 2.40546 7.89291C2.29984 8.39652 2.46 8.82006 2.79889 9.19834C4.91928 11.5748 7.5805 13.0926 10.569 14.0882C12.2658 14.6533 14.0113 14.9967 15.7916 15.2161C14.7297 15.5595 13.6376 15.664 12.5362 15.6361C10.4042 15.5827 8.40452 15.071 6.52553 14.1578C5.83266 13.8016 5.18738 13.4047 5.01793 13.2979C4.92044 13.2318 4.81947 13.1912 4.71966 13.2678C4.53281 13.4128 4.66163 13.667 4.72198 13.8654C4.83688 14.2471 5.10266 14.5105 5.44735 14.6927C8.50897 16.3114 11.7412 16.9589 15.1823 16.3846C15.5305 16.3265 15.8613 16.2627 16.2257 16.1397C15.6501 16.6375 14.9839 16.9624 14.284 17.2189C12.1288 18.0068 9.98756 17.9754 7.8544 17.4417C7.16966 17.2583 6.37582 16.9601 6.37582 16.9601C6.26092 16.9102 6.14718 16.8928 6.05898 17.0193C5.90346 17.2421 6.03925 17.473 6.17388 17.6842C6.49188 18.1797 7.10699 18.2284 7.59327 18.3966C7.75924 18.45 7.30661 18.7517 7.16153 18.8631C6.4559 19.4027 5.76535 19.8959 5.0632 20.418L4.6036 20.7569C4.52468 20.8114 4.45505 20.8729 4.49103 20.9866C4.53281 21.1154 4.66628 21.1386 4.79626 21.1653C5.29879 21.2697 5.72821 21.1026 6.12513 20.8056C6.97584 20.1685 7.8428 19.5501 8.67494 18.8886C8.99178 18.6368 9.2796 18.6577 9.7125 18.7691C8.62967 19.5849 7.61648 20.3496 6.60213 21.1131C5.57269 21.8871 4.54325 22.661 3.51381 23.4338L2.83371 23.9374C2.82327 23.9444 2.81398 23.9514 2.8047 23.9595L2.79425 23.9665C2.73622 24.0129 2.69328 24.0651 2.70605 24.1324C2.7339 24.2856 2.91379 24.3239 3.06119 24.3494C3.66933 24.4538 4.04652 24.2252 4.46201 23.9131C6.54294 22.3512 8.63083 20.7998 10.7002 19.2228C11.1644 18.8689 11.6414 18.6693 12.311 18.7448C11.7412 19.1706 11.1934 19.5802 10.6537 19.984L9.18676 21.069C9.17631 21.076 9.16586 21.0841 9.15658 21.0922C9.07882 21.1537 9.02427 21.2256 9.05445 21.3324C9.11016 21.5262 9.34343 21.5494 9.54189 21.5796C9.90632 21.6341 10.215 21.5053 10.5017 21.2918C10.6665 21.1688 10.8325 21.0481 10.9984 20.9286L13.2384 19.1497C13.2384 19.1497 13.7676 18.7714 14.3804 18.4245C14.4349 18.3908 14.4895 18.356 14.5452 18.3224C14.5684 18.3119 14.6264 18.2852 14.7146 18.2435C14.7808 18.2098 14.8469 18.1762 14.9119 18.1448C15.0083 18.0961 15.1197 18.0369 15.245 17.9685C15.606 17.8188 16.64 17.3361 17.4942 16.4263C17.9004 16.113 18.4726 15.7034 18.9183 15.5061H18.9206C18.9542 15.4911 18.9879 15.4771 19.0204 15.4655L19.0239 15.4644C19.0459 15.4563 19.0668 15.4493 19.0877 15.4423L19.1446 15.4203C19.3059 15.375 19.5682 15.3576 19.603 15.7127C19.6088 15.7997 19.6076 15.8891 19.5972 15.9831C19.5902 16.0538 19.5763 16.1293 19.5659 16.1896C19.5554 16.2476 19.5798 16.3056 19.6262 16.3405C19.6332 16.3463 19.6413 16.3509 19.6494 16.3544C19.7109 16.3846 19.7852 16.3706 19.8316 16.3196C19.8491 16.301 19.8665 16.2813 19.8839 16.2627C20.1032 16.0318 20.3261 15.8717 20.5628 15.7742C20.9087 15.6315 21.2592 15.6303 21.6317 15.773C21.8093 15.8403 21.9764 15.9332 22.1424 16.055C22.2132 16.1072 22.284 16.1652 22.3548 16.2291C22.3965 16.2674 22.4383 16.3091 22.4755 16.3463L22.4813 16.3521L22.5114 16.3822C22.5114 16.3822 22.523 16.3927 22.5288 16.3973C22.5637 16.4228 22.6089 16.4333 22.653 16.424C22.7041 16.4124 22.7459 16.3764 22.7644 16.3277C22.7679 16.3184 22.7714 16.3091 22.7749 16.2998C22.8805 15.9865 22.9026 15.6988 22.841 15.418L22.8399 15.4191Z"],"c":"#F2795B"};   // Arize-ai/phoenix-assets logos/Phoenix/phoenix-white.svg, recoloured
LOGOS["ragas"] = {img:"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAAADNElEQVR42u2avW4TQRDHc3EQ6QJEQXQ0vAMtFVJyuyDRUfHV8gRIiDQgKkQRg2h4BSQaoKQAFO8awkeAAl4CUST2eZa59f/sTc54t0jubiOvNJrx+s6Zn/93M7s5z00aRsnEei3m547SMEoksSU8b71OL3L8mZW5Ey0MLqm3RkvDyefWHs13IoIxm2vHOPlvFkSLXQA9iw7GvJcMIhnEqpGx7xsVFwxARK7INpQYkJJEMcJAkREIPOXKUDwwZRA28sFEo0gkMH6QSGD8IJHA+EGigvGDhMOQEklDQfwwpgSTJhGAlGDcpvnUXWhGAeLCwPex0HziwjQGJEoYP4gfhjwwtYFUAFNvH3GXMKQkhcGkSbM6uyrmRQZPbGEwWiSNUYSU2OX4D2KbLMfEMU0pAG0Xph6QclL3TSdd4oS28H4PMLlak2F0GaZOkAwg1+zx3XSZ40+A6E1ThpRE0wQM7pm6QW6Ov9nVJX790SapRY/9EEYDQvv7TOUgNAa5gSSOW9+RJzneyiGIYYbHACawadajCEBIiVZugDnF819G94wWuQ+rZoCpDcQAYuS1XObEv0IRC4ObPximUhDaB+LG1F1bYYBtoxxlUABCm2blN7sLgpLaQjU7zfEPVKmehdfTlaGSMocEQnsVue6CTIRR6RmOf9pztchQ1aiCVXNYQwTIbfyxRU5ugc9ZyL0TL6IYnOXXv1DNBuxDFpob7rb5EEByw9rKNsHVE4GPKy6gUQ6gaghM24U5UBDSgpBQNvTiN9tDUvIu+3Wev2dNCfZsSq6zz997ZZRTiv2bswxf2oZbAA5SEWJfwNjLBNe9Iesdw3xxDM6rbqeJ/8ZPBHHkJygyyLs4+gWbHBvmyc6LzKNIKEy4MrTn+YgESLXm388EwJgPVpHvjiJUKwyUoX0wpEUAjBLv8CEZW9Ug/moW/lRXPi92ge5N3hgYLR5PB9EAUeI8W/FBO2x9qFO39TmnHeR1C5dY6z8wlwqYq6zEX5TORpnb/Tk/C+KDOccqPWL/gu0N2+s6DTm8JCUemE2xgj3QtJsekjV7+CHcH9ewtUz3ctKY5LtXEuqIlu3yszEbsxE8/gFo+tDaHmgtXAAAAABJRU5ErkJggg=="};   // Ragas ships no vector; this is their 50px PNG, alpha intact
LOGOS["langsmith"] = LOGOS["langchain"]!;   // LangSmith is a LangChain product; no separate published mark
function markHTML(key: string, size = 16) {
  const L = LOGOS[key];
  if (L?.img) return `<img class="lg" src="${L.img}" width="${size}" height="${size}" alt="" aria-hidden="true">`;
  if (L) return `<svg class="lg" viewBox="${L.vb}" width="${size}" height="${size}" aria-hidden="true">` +
    L.d!.map((d) => `<path d="${d}" fill="${L.c}"/>`).join("") + `</svg>`;
  return `<span class="lg lt neutral" style="width:${size}px;height:${size}px">\u2022</span>`;
}

/* ---------- persona: say it in the reader's own testing dialect ----------
   The concepts don't change per language; only the code samples do, so the
   control is labelled for what it actually switches rather than promising a
   re-explanation of the whole page. Four sites read it: the broken assertion
   in 01 and 11, the two in 02, and the faithfulness division in 08.
   "Plain English" hides code entirely and reveals the .prose-only fallbacks. */
const PERSONAS = [
  { id: "python", label: "Python",        fw: "pytest",  mk: ["python"] },
  { id: "java",   label: "Java",          fw: "JUnit 5", mk: ["java"] },
  { id: "js",     label: "JS · TS",       fw: "Jest",    mk: ["javascript", "typescript"] },
  { id: "dotnet", label: "C#",            fw: "xUnit",   mk: ["dotnet"] },
  { id: "none",   label: "Plain English", fw: "no code", mk: [] },
];
let curPersona: string = "python";
const TAB_LABELS: Record<string, string> = { correctness: "Answer Correctness", faithfulness: "Faithfulness", recall: "Context Recall" };
const scoreColor = (v: number) => (v >= 0.85 ? "var(--good)" : v >= 0.6 ? "var(--warn)" : "var(--danger)");
function paintTabScores(scores: Record<string, number>) {
  for (const k in TAB_LABELS) {
    const b = $(`#metricTabs [data-tab="${k}"]`);
    if (b) b.innerHTML = `${TAB_LABELS[k]}<span class="sc" style="--sc:${scoreColor(scores[k]!)}">${scores[k]!.toFixed(2)}</span>`;
  }
}
let curSample: Sample | null = null;   // declared before setPersona reads it; assigned once SAMPLES exists
const GT = "You have 365 days to return any item.";
const C = (t: string) => `<span class="c">${t}</span>`;
const S = (t: string) => `<span class="str">"${t}"</span>`;
const F = (t: string) => `<span class="fn">${t}</span>`;
const V = (t: string) => `<span class="var">${t}</span>`;
const K = (t: string) => `<span class="kw">${t}</span>`;
type Pack = { [k: string]: string | Record<string, string> | undefined; meta: Record<string, string> };
const SNIPPETS: Record<string, Pack> = {
  python: {
    "assert": `${K("assert")} ${V("actual")} == ${V("expected")}`,
    "assert-fail": `${C("# pytest")}\n${K("assert")} ${V("actual")} == ${S(GT)}\n${C("# FAILED ×3")}`,
    "assert-pass": `${C("# pytest")}\n${K("assert")} ${F("conveys_fact")}(${V("actual")}, ${S("365-day returns")})\n${C("# PASSED ×3")}`,
    "faith-math": `${V("total")}   = ${F("len")}(${V("statements")})\n${V("grounded")} = ${F("len")}(${V("comparison")}[${S("both")}])\n\n${K("return")} ${V("grounded")} / ${V("total")}   ${C("# %G% / %T% = %R%")}`,
    meta: { faith: "plain Python · no model" },
  },
  java: {
    "assert": `${F("assertEquals")}(${V("expected")}, ${V("actual")})`,
    "assert-fail": `${C("// JUnit 5")}\n${F("assertEquals")}(${S(GT)}, ${V("actual")});\n${C("// FAILED ×3")}`,
    "assert-pass": `${C("// JUnit 5")}\n${F("assertTrue")}(${F("conveysFact")}(${V("actual")}, ${S("365-day returns")}));\n${C("// PASSED ×3")}`,
    "faith-math": `${K("int")} ${V("total")}    = ${V("statements")}.${F("size")}();\n${K("int")} ${V("grounded")} = ${V("comparison")}.${F("get")}(${S("both")}).${F("size")}();\n\n${K("return")} (${K("double")}) ${V("grounded")} / ${V("total")};   ${C("// %G% / %T% = %R%")}`,
    meta: { faith: "plain Java · no model" },
  },
  js: {
    "assert": `${F("expect")}(${V("actual")}).${F("toBe")}(${V("expected")})`,
    "assert-fail": `${C("// Jest")}\n${F("expect")}(${V("actual")}).${F("toBe")}(${S(GT)});\n${C("// ✕ ×3")}`,
    "assert-pass": `${C("// Jest")}\n${F("expect")}(${F("conveysFact")}(${V("actual")}, ${S("365-day returns")})).${F("toBe")}(${K("true")});\n${C("// ✓ ×3")}`,
    "faith-math": `${K("const")} ${V("total")}    = ${V("statements")}.length;\n${K("const")} ${V("grounded")} = ${V("comparison")}.both.length;\n\n${K("return")} ${V("grounded")} / ${V("total")};   ${C("// %G% / %T% = %R%")}`,
    meta: { faith: "plain JS · no model" },
  },
  dotnet: {
    "assert": `${F("Assert.Equal")}(${V("expected")}, ${V("actual")})`,
    "assert-fail": `${C("// xUnit")}\n${F("Assert.Equal")}(${S(GT)}, ${V("actual")});\n${C("// Failed ×3")}`,
    "assert-pass": `${C("// xUnit")}\n${F("Assert.True")}(${F("ConveysFact")}(${V("actual")}, ${S("365-day returns")}));\n${C("// Passed ×3")}`,
    "faith-math": `${K("var")} ${V("total")}    = ${V("statements")}.${F("Count")};\n${K("var")} ${V("grounded")} = ${V("comparison")}.Both.${F("Count")};\n\n${K("return")} (${K("double")}) ${V("grounded")} / ${V("total")};   ${C("// %G% / %T% = %R%")}`,
    meta: { faith: "plain C# · no model" },
  },
};
function setPersona(id: string) {
  document.body.dataset["persona"] = id;
  $$("[data-p]").forEach((b) => b.classList.toggle("on", b.dataset["p"] === id));
  curPersona = id;
  const pack = SNIPPETS[id];
  if (pack) {
    // the arithmetic comment has to agree with whichever run is selected
    const g = curSample ? curSample.claims.filter((c) => c[1]).length : 3;
    const t = curSample ? curSample.claims.length : 4;
    const fill = (str: string) => str.replace("%G%", String(g)).replace("%T%", String(t)).replace("%R%", (g / t).toFixed(2));
    $$("[data-snip]").forEach((el) => { el.innerHTML = fill((pack[el.dataset["snip"]!] as string | undefined) ?? ""); });
    $$("[data-snip-meta]").forEach((el) => { el.textContent = pack.meta?.[el.dataset["snipMeta"]!] ?? ""; });
  } else {
    $$("[data-snip-meta]").forEach((el) => { el.textContent = "just division"; });
  }
  saveHash({ ...loadHash<Hash>(), persona: id });
}
$("#personaOpts")!.innerHTML = PERSONAS.map(
  (p) => `<button data-p="${p.id}">${p.mk.map((m) => markHTML(m)).join("")}${p.label}<span class="fw">${p.fw}</span></button>`).join("");
$("#personaOpts")!.addEventListener("click", (e) => {
  const b = (e.target as Element).closest("button");
  if (b) setPersona(b.dataset["p"]!);
});
setPersona(loadHash<Hash>().persona ?? "python");

/* ---------- one run, three metrics ----------
   Every metric grades the same input, so the run is picked once, above the
   tabs, and each pane re-renders from it. The point of the three samples is
   that they fail in different places: B fails at retrieval, C only fails
   faithfulness. Counts drive the drawings — nothing here is hardcoded art. */
const QUESTION = "Do you offer free shipping, and how long do I have to return something?";
const TRUTH = "Yes — orders over $75 ship free, and you have 365 days to return any item.";
const G_FACTS = ["Orders over $75 ship free.", "Items can be returned within 365 days."];
const G = G_FACTS;
interface Sample {
  id: string; label: string; short: string; tone: "good" | "danger" | "warn";
  meta: [string, string][]; ans: string; tp: string[]; fp: string[]; fn: string[];
  claims: [string, number][]; gtFound: number[]; chunks: [string, number][]; verdict: string; fix: string;
}
const SAMPLES: Sample[] = [
  {
    id: "covered", label: "Everything covered", short: "Covered", tone: "good",
    meta: [["model", "gpt-4o-mini"], ["latency", "1.2s"], ["tokens", "318"]],
    ans: "Orders over $75 ship free, and you have 365 days to return anything.",
    tp: ["Orders over $75 ship free.", "Returns accepted within 365 days."],
    fp: [], fn: [],
    claims: [["free shipping over $75", 1], ["365-day returns", 1]],
    gtFound: [1, 1],
    chunks: [["Free shipping over $75.", 1], ["365-day return window.", 1], ["Careers at the company…", 0], ["Gift card terms…", 0]],
    verdict: "Nothing to chase. Retrieval found the policy and the answer used it.",
    fix: "Nothing here. The thing to do next is make the golden set harder — a suite that always reads 1.00 has stopped telling you anything.",
  },
  {
    id: "norag", label: "Retrieval missed", short: "Retrieval missed", tone: "danger",
    meta: [["model", "gpt-4o-mini"], ["latency", "0.9s"], ["tokens", "241"]],
    ans: "Shipping is free over $200, and returns close after 30 days.",
    tp: [], fp: ["Shipping is free over $200.", "Returns close after 30 days."], fn: G_FACTS,
    claims: [["free shipping over $200", 0], ["30-day returns", 0]],
    gtFound: [0, 0],
    chunks: [["Wholesale freight rates…", 0], ["Careers at the company…", 0], ["Gift card terms…", 0], ["Press release, 2019…", 0]],
    verdict: "All three bottom out together, and Context Recall says where it started: search never surfaced the policy, so the model had nothing to work from. Rewriting the prompt would not have helped.",
    fix: "Fix retrieval before touching anything else. Check the corpus actually contains the policy, then the chunking and the query. Prompt work is wasted while this reads zero.",
  },
  {
    id: "ignored", label: "Ignored the context", short: "Ignored context", tone: "danger",
    meta: [["model", "gpt-4o-mini"], ["latency", "1.1s"], ["tokens", "263"]],
    ans: "Shipping is free over $200, and returns close after 30 days.",
    tp: [], fp: ["Shipping is free over $200.", "Returns close after 30 days."], fn: G_FACTS,
    claims: [["free shipping over $200", 0], ["30-day returns", 0]],
    gtFound: [1, 1],
    chunks: [["Free shipping over $75.", 1], ["365-day return window.", 1], ["Careers at the company…", 0], ["Gift card terms…", 0]],
    verdict: "The most useful disagreement on the page. Retrieval did its job — Context Recall is perfect, so the right policy was sitting in the context — and the model answered as if it were not there. A high retrieval score beside two floored ones tells you the fault is in generation, not search.",
    fix: "Fix generation. The context was right there, so search is not your problem: look at the prompt, at whether the retrieved text is really being passed in, and at how much else is competing for the context window.",
  },
  {
    id: "padded", label: "Padded, all sourced", short: "Padded (true)", tone: "warn",
    meta: [["model", "gpt-4o-mini"], ["latency", "2.1s"], ["tokens", "541"]],
    ans: "Free over $75, 365-day returns — and we price-match and gift-wrap.",
    tp: ["Orders over $75 ship free.", "Returns accepted within 365 days."],
    fp: ["The store price-matches.", "The store gift-wraps."], fn: [],
    claims: [["free shipping over $75", 1], ["365-day returns", 1], ["price-matching", 1], ["gift-wrapping", 1]],
    gtFound: [1, 1],
    chunks: [["Free shipping over $75.", 1], ["365-day return window.", 1], ["We price-match competitors.", 0], ["Gift wrapping is available.", 0]],
    verdict: "Everything it said is true and sourced — Faithfulness is perfect. Answer Correctness still dips, because it counts anything the expert did not ask for against you. Compare this with the next run.",
    fix: "Nothing is broken. Decide whether you actually care about verbosity — if you do not, this is a passing run and the correctness threshold should be set to allow it.",
  },
  {
    id: "invented", label: "Padded, partly invented", short: "Padded (made up)", tone: "warn",
    meta: [["model", "gpt-4o-mini"], ["latency", "2.4s"], ["tokens", "596"]],
    ans: "Free over $75, 365-day returns — and we price-match and gift-wrap.",
    tp: ["Orders over $75 ship free.", "Returns accepted within 365 days."],
    fp: ["The store price-matches.", "The store gift-wraps."], fn: [],
    claims: [["free shipping over $75", 1], ["365-day returns", 1], ["price-matching", 0], ["gift-wrapping", 0]],
    gtFound: [1, 1],
    chunks: [["Free shipping over $75.", 1], ["365-day return window.", 1], ["Careers at the company…", 0], ["Gift card terms…", 0]],
    verdict: "Identical answer to the run above, and Answer Correctness scores it identically — it cannot tell a true extra from an invented one. Faithfulness can: these two extras appear nowhere in the context.",
    fix: "Tighten grounding: tell the model to answer only from the context, and make refusing an acceptable answer when the context is thin.",
  },
];
const SV = "http://www.w3.org/2000/svg";
const el = (n: string, a: Record<string, string | number> = {}, t?: string | null) => { const e = document.createElementNS(SV, n); for (const k in a) e.setAttribute(k, String(a[k])); if (t != null) e.textContent = t; return e; };
const svgWrap = (vb: string, label: string) => { const s = el("svg", { viewBox: vb, role: "img", "aria-label": label }); s.style.width = "100%"; s.style.height = "auto"; return s; };
const TONE = { good: "var(--good)", danger: "var(--danger)", warn: "var(--warn)" };

function chip(sv: Element, x: number, y: number, w: number, h: number, color: string, tag: string, text: string, dash?: boolean) {
  const g = el("g", { "data-viz-id": `chip-${tag}`, "data-label": `${tag}: ${text}` });
  g.appendChild(el("rect", { x, y, width: w, height: h, rx: 5,
    fill: `color-mix(in srgb, ${color} 15%, transparent)`, stroke: color, ...(dash ? { "stroke-dasharray": "4 3" } : {}) }));
  const t = el("text", { x: x + 9, y: y + h / 2 + 4, style: "font-size:11px;fill:var(--text)" }, text);
  g.appendChild(t);
  sv.appendChild(g);
  return g;
}

function renderCorrectness(s: Sample) {
  const host = $("#ccFlow")!; host.innerHTML = "";
  // size for the busiest run so switching runs never shifts the page
  const rows = Math.max(...SAMPLES.map((x) => Math.max(G.length, x.tp.length + x.fp.length)));
  const H = 250 + rows * 34;
  const sv = svgWrap(`0 0 900 ${H}`, `Statements from the ground truth and the answer, sorted into a Venn: ${s.tp.length} in both, ${s.fp.length} answer-only, ${s.fn.length} ground-truth-only`);
  sv.appendChild(el("text", { x: 10, y: 14, style: "font-size:10.5px;font-weight:700;fill:var(--c5)" }, "FROM THE GROUND TRUTH"));
  sv.appendChild(el("text", { x: 890, y: 14, "text-anchor": "end", style: "font-size:10.5px;font-weight:700;fill:var(--c2)" }, "FROM THE ACTUAL ANSWER"));
  const cy = H - 118, r = 105, cxL = 382, cxR = 518;
  const zone = { fn: cxL - 54, tp: 450, fp: cxR + 54 };
  const arrow = (x1: number, y1: number, x2: number) => sv.appendChild(el("path",
    { d: `M${x1} ${y1} C ${x1 + (x2 > x1 ? 60 : -60)} ${y1}, ${x2} ${cy - r - 60}, ${x2} ${cy - r - 6}`,
      fill: "none", stroke: "var(--border)", "stroke-width": 1.2 }));
  G.forEach((t, i) => {
    const y = 26 + i * 34;
    const hit = s.tp.length > 0 && !s.fn.includes(t);
    chip(sv, 10, y, 272, 28, hit ? "var(--good)" : "var(--warn)", `G${i + 1}`, t);
    arrow(282, y + 14, hit ? zone.tp : zone.fn);
  });
  [...s.tp.map((t): [string, string] => [t, "tp"]), ...s.fp.map((t): [string, string] => [t, "fp"])].forEach(([t, kind], i) => {
    const y = 26 + i * 34;
    chip(sv, 618, y, 272, 28, kind === "tp" ? "var(--good)" : "var(--danger)", `A${i + 1}`, t, kind === "fp");
    arrow(618, y + 14, kind === "tp" ? zone.tp : zone.fp);
  });
  sv.appendChild(el("circle", { cx: cxL, cy, r, fill: "color-mix(in srgb,var(--warn) 14%,transparent)", stroke: "var(--warn)" }));
  sv.appendChild(el("circle", { cx: cxR, cy, r, fill: "color-mix(in srgb,var(--danger) 12%,transparent)", stroke: "var(--danger)" }));
  // explicit lens for the intersection — otherwise warn+danger stack into a muddy red
  const half = (cxR - cxL) / 2, hh = Math.sqrt(r * r - half * half), xm = (cxL + cxR) / 2;
  sv.appendChild(el("path", {
    d: `M ${xm} ${cy - hh} A ${r} ${r} 0 0 1 ${xm} ${cy + hh} A ${r} ${r} 0 0 1 ${xm} ${cy - hh}`,
    fill: "color-mix(in srgb,var(--good) 26%,transparent)", stroke: "var(--good)", "stroke-width": 1.5 }));
  const zlabel = (x: number, color: string, head: string, n: number, sub: string) => {
    const g = el("g", { class: "vennnum" });
    g.appendChild(el("text", { x, y: cy - 14, "text-anchor": "middle", style: `font-size:11.5px;font-weight:700;fill:${color}` }, head));
    g.appendChild(el("text", { x, y: cy + 14, "text-anchor": "middle", style: `font-size:22px;font-weight:700;fill:${color}` }, String(n)));
    g.appendChild(el("text", { x, y: cy + 32, "text-anchor": "middle", style: "font-size:10px;fill:var(--muted)" }, sub));
    sv.appendChild(g);
  };
  zlabel(zone.fn, "var(--warn)", "⚠ FN", s.fn.length, "it left out");
  zlabel(zone.tp, "var(--good)", "✓ TP", s.tp.length, "in both");
  zlabel(zone.fp, "var(--danger)", "✗ FP", s.fp.length, "it made up");
  host.appendChild(sv);
  // switching runs re-sorts the same facts into different regions; stagger the
  // entrance so that re-sorting is something you watch rather than infer
  sv.querySelectorAll<SVGElement>('[data-viz-id^="chip-"]').forEach((g, i) => { g.style.animationDelay = `${i * 70}ms`; });
  sv.querySelectorAll<SVGElement>(".vennnum").forEach((g, i) => { g.style.animationDelay = `${260 + i * 90}ms`; });

  const tp = s.tp.length, fp = s.fp.length, fn = s.fn.length;
  const f1 = tp === 0 ? 0 : tp / (tp + 0.5 * (fp + fn));
  const fmt = (n: number) => n.toFixed(2);
  $("#ccMath")!.innerHTML =
    `<div><span class="lbl">counts →</span>&nbsp; FN = <span class="w">${fn}</span> &nbsp;&nbsp; TP = <span class="g">${tp}</span> &nbsp;&nbsp; FP = <span class="r">${fp}</span></div>` +
    `<div><span class="lbl">precision</span> = TP / (TP + FP) = <b>${tp + fp === 0 ? "—" : fmt(tp / (tp + fp))}</b> &nbsp; <span style="font-size:11px">of what it said, how much was asked for</span></div>` +
    `<div><span class="lbl">recall</span>&nbsp;&nbsp;&nbsp;&nbsp; = TP / (TP + FN) = <b>${tp + fn === 0 ? "—" : fmt(tp / (tp + fn))}</b> &nbsp; <span style="font-size:11px">of what was asked for, how much it said</span></div>` +
    `<div style="margin-top:7px"><span class="lbl">F1 &mdash; the two balanced</span> = TP / (TP + ½·(FP + FN)) = <span class="fin">${fmt(f1)}</span></div>`;
  return f1;
}

function renderFaithfulness(s: Sample) {
  const host = $("#faFlow")!; host.innerHTML = "";
  const n = s.claims.length, gap = 12, w = (900 - gap * (n - 1)) / n;
  const sv = svgWrap("0 0 900 104", `${n} claims the answer made; ${s.claims.filter((c) => c[1]).length} supported by the retrieved context`);
  sv.appendChild(el("text", { x: 0, y: 13, style: "font-size:10.5px;font-family:var(--mono);fill:var(--muted)" }, "every claim the answer made →"));
  s.claims.forEach(([t, ok], i) => {
    const x = i * (w + gap);
    const g = el("g", { "data-viz-id": `claim-${i + 1}`, "data-label": `${t} — ${ok ? "grounded" : "hallucinated"}` });
    g.appendChild(el("rect", { x, y: 24, width: w, height: 46, rx: 5,
      fill: `color-mix(in srgb,${ok ? "var(--good)" : "var(--danger)"} 16%,transparent)`,
      stroke: ok ? "var(--good)" : "var(--danger)", ...(ok ? {} : { "stroke-dasharray": "4 3" }) }));
    g.appendChild(el("text", { x: x + w / 2, y: 43, "text-anchor": "middle", style: "font-size:10.5px;fill:var(--text)" }, t.slice(0, 22)));
    g.appendChild(el("text", { x: x + w / 2, y: 60, "text-anchor": "middle",
      style: `font-size:10.5px;fill:${ok ? "var(--good)" : "var(--danger)"}` }, ok ? "✓ in the context" : "✗ nowhere in it"));
    sv.appendChild(g);
  });
  const ok = s.claims.filter((c) => c[1]).length;
  sv.appendChild(el("text", { x: 0, y: 92, style: "font-size:11.5px;fill:var(--muted)" },
    `${ok} grounded ÷ ${n} claimed — anything unsupported is a hallucination, and it drags the ratio down.`));
  host.appendChild(sv);
  $("#faMath")!.innerHTML = `<div><span class="lbl">faithfulness</span> = grounded / total = ${ok} / ${n} = <span class="fin">${(ok / n).toFixed(2)}</span></div>`;
  return ok / n;
}

function renderRecall(s: Sample) {
  const host = $("#cxFlow")!; host.innerHTML = "";
  const facts = G_FACTS, n = facts.length, gap = 14, w = (900 - gap * (n - 1)) / n;
  const found = s.gtFound;
  const sv = svgWrap("0 0 900 104", `${n} facts the ground truth requires; ${found.filter(Boolean).length} of them present in the retrieved context`);
  sv.appendChild(el("text", { x: 0, y: 13, style: "font-size:10.5px;font-family:var(--mono);fill:var(--muted)" }, "facts the expert's answer requires →"));
  facts.forEach((t, i) => {
    const ok = found[i], x = i * (w + gap);
    const g = el("g", { "data-viz-id": `gt-${i + 1}`, "data-label": `${t} — ${ok ? "present in the context" : "missing from the context"}` });
    g.appendChild(el("rect", { x, y: 24, width: w, height: 46, rx: 5,
      fill: `color-mix(in srgb,${ok ? "var(--good)" : "var(--danger)"} 16%,transparent)`,
      stroke: ok ? "var(--good)" : "var(--danger)", ...(ok ? {} : { "stroke-dasharray": "4 3" }) }));
    g.appendChild(el("text", { x: x + w / 2, y: 43, "text-anchor": "middle", style: "font-size:11px;fill:var(--text)" }, t));
    g.appendChild(el("text", { x: x + w / 2, y: 60, "text-anchor": "middle",
      style: `font-size:10.5px;fill:${ok ? "var(--good)" : "var(--danger)"}` }, ok ? "✓ in the context" : "✗ never retrieved"));
    sv.appendChild(g);
  });
  const ok = found.filter(Boolean).length;
  sv.appendChild(el("text", { x: 0, y: 92, style: "font-size:11.5px;fill:var(--muted)" },
    ok === n ? "Everything the answer needed was there to find." : `${n - ok} of ${n} required facts never came back — the app could not have answered correctly.`));
  host.appendChild(sv);
  $("#cxMath")!.innerHTML =
    `<div><span class="lbl">context recall</span> = required facts present / required facts = ${ok} / ${n} = <span class="fin">${(ok / n).toFixed(2)}</span></div>` +
    `<div style="margin-top:6px"><span class="lbl" style="font-size:11.5px">A plain fraction. No ranking, no weighting — either the fact was retrievable or it was not.</span></div>`;
  return ok / n;
}

/* Call chains are rendered from the selected run, not described in the abstract —
   "the actual answer" means nothing until you can see which answer. */
const QT = (h: string, t: string) => `<div class="quoted"><span class="qh">${h}</span>${t}</div>`;
const ROWS = (items: [string, string][]) => items.length
  ? `<div class="outrows">${items.map(([t, c]) => `<div class="outrow" style="--p:${c}">${t}</div>`).join("")}</div>`
  : "";
const LINES = (groups: [string, string[], string][]) => `<div class="outrows">${groups.map(([label, arr, c]) =>
  `<div class="outgroup" style="--p:${c}"><span class="ogh">${label}</span>${
    arr.length ? arr.map((t) => `<div class="outrow" style="--p:${c}">${t}</div>`).join("") : `<div class="outrow none">none</div>`}</div>`).join("")}</div>`;
const CK = { good: "var(--good)", bad: "var(--danger)", miss: "var(--warn)", gt: "var(--c5)", ans: "var(--c2)" };
interface Call { n: string; note?: string; in: string; ask: string; out: string; why?: string }
function renderCalls(sel: string, steps: Call[]) {
  $(sel)!.innerHTML = steps.map((st) => `
    <div class="call">
      <div class="ch">${st.n}${st.note ? `<em>${st.note}</em>` : ""}</div>
      <div class="cio"><span class="tag in">in</span><div style="flex:1">${st.in}</div></div>
      <div class="ask">${st.ask}</div>
      <div class="cio"><span class="tag out">out</span><div style="flex:1">${st.out}</div></div>
      ${st.why ? `<p class="why">${st.why}</p>` : ""}
    </div>`).join(`<div class="callarrow">its output feeds the next call</div>`);
}
function renderAllCalls(s: Sample) {
  const ansStmts = [...s.tp.map((t): [string, string] => [t, CK.good]), ...s.fp.map((t): [string, string] => [t, CK.bad])];
  renderCalls("#ccCalls", [
    { n: "Call 1 &times;2", note: "— the same prompt, run once per side",
      in: QT("the ground truth", `"${TRUTH}"`) + QT("the actual answer", `"${s.ans}"`),
      ask: "&ldquo;List the standalone facts stated here, one per line.&rdquo;",
      out: LINES([["from the ground truth", G, CK.gt], ["from the actual answer", ansStmts.map(([t]) => t), CK.ans]]),
      why: "Both sides get the same treatment, so they can be lined up fact by fact instead of word by word. These two lists are the entire output of call 1." },
    { n: "Call 2",
      in: "The two lists above.",
      ask: "&ldquo;Which facts appear in both lists, and which appear in only one?&rdquo;",
      out: LINES([[`truth-only — it left these out — FN`, s.fn, CK.miss], [`in both — it got these right — TP`, s.tp, CK.good], [`answer-only — it made these up — FP`, s.fp, CK.bad]]),
      why: "Those three groups <b>are</b> the three regions of the diagram below — in both is the overlap, and the other two are the crescents either side." },
  ]);
  renderCalls("#faCalls", [
    { n: "Call 1",
      in: QT("the actual answer", `"${s.ans}"`),
      ask: "&ldquo;List every claim this answer makes.&rdquo;",
      out: ROWS(s.claims.map(([t]) => [t, CK.ans])),
      },
    { n: "Call 2",
      in: `The claims above, plus what the app actually read:` +
          s.chunks.map(([t], i) => QT(`context #${i + 1}`, t)).join(""),
      ask: "&ldquo;For each claim — does the context support it?&rdquo;",
      out: ROWS(s.claims.map(([t, ok]) => [`${ok ? "✓" : "✗"}&nbsp; ${t}`, ok ? CK.good : CK.bad])),
      why: "Yes or no per claim. The score is the ratio of yeses, computed in code — the model never gives a number." },
  ]);
  renderCalls("#cxCalls", [
    { n: "Call 1",
      in: QT("the ground truth", `"${TRUTH}"`),
      ask: "&ldquo;List the facts this answer requires.&rdquo;",
      out: ROWS(G_FACTS.map((t) => [t, CK.gt])),
      why: "The same decomposition Faithfulness runs &mdash; just pointed at the expert's answer instead of the app's." },
    { n: "Call 2",
      in: `The required facts above, plus what actually came back:` +
          s.chunks.map(([t], i) => QT(`context #${i + 1}`, t)).join(""),
      ask: "&ldquo;For each required fact — is it present in this context?&rdquo;",
      out: ROWS(G_FACTS.map((t, i) => [`${s.gtFound[i] ? "✓" : "✗"}&nbsp; ${t}`, s.gtFound[i] ? CK.good : CK.bad])),
      why: "Nothing about the app's answer enters this metric. It grades retrieval alone, which is why it can stay high while everything else collapses." },
  ]);

}

curSample = SAMPLES[0]!;
function setSample(id: string) {
  curSample = SAMPLES.find((x) => x.id === id) ?? SAMPLES[0]!;
  $$("[data-s]").forEach((b) => b.classList.toggle("on", b.dataset["s"] === curSample!.id));
  $("#sampleCard")!.innerHTML =
    `<div class="tcrun">
       <div class="tcbox tc">
         <div class="tch">The test case<em>Written up front by a subject-matter expert, before any app code exists.</em></div>
         <div class="iobox q"><div class="il">Question<span class="iotag" style="--t:var(--accent)">input</span></div><p>"${QUESTION}"</p></div>
         <div class="iobox gt"><div class="il">Ground truth<span class="iotag" style="--t:var(--c5)">expected output</span></div><p>"${TRUTH}"</p></div>
         <div class="il" style="margin-top:9px">Labels<span class="iotag" style="--t:var(--muted)">your own metadata</span></div>
         <div class="metarow">${["policy", "shipping", "returns", "tier: core"].map((t) => `<div class="mi">${t}</div>`).join("")}</div>
       </div>
       <div class="tcbox run">
         <div class="tch">+ what a run adds<em>Only exists once you actually ask the app the question.</em></div>
         <div class="iobox ans"><div class="il">Actual answer<span class="iotag" style="--t:var(--c2)">actual output</span></div><p>"${curSample.ans}"</p></div>
         <div class="iobox ans" style="border-left-color:var(--c5)">
           <div class="il">Retrieved context<span class="iotag" style="--t:var(--c5)">what it was given to read</span></div>
           <div class="ctxlist">${curSample.chunks.map(([t], i) => `<div class="cx">#${i + 1} ${t}</div>`).join("")}</div>
         </div>
         <div class="il" style="margin-top:9px">Run metadata<span class="iotag" style="--t:var(--muted)">whatever you record</span></div>
         <div class="metarow">${curSample.meta.map(([k, v]) => `<div class="mi">${k} <b>${v}</b></div>`).join("")}</div>
       </div>
     </div>`;
  renderAllCalls(curSample);
  setPersona(curPersona);
  const scores: Record<string, number> = {
    correctness: renderCorrectness(curSample),
    faithfulness: renderFaithfulness(curSample),
    recall: renderRecall(curSample),
  };
  paintTabScores(scores);
  // the reading belongs under all three panes, not inside one of them —
  // the point is what the scores say *together*.
  $("#runRead")!.style.setProperty("--vt", TONE[curSample.tone]);
  $("#runRead")!.innerHTML =
    `<h4>What this run tells you</h4>
     <div class="rrscores">${Object.entries(TAB_LABELS).map(([k, lbl]) =>
       `<div class="rrscore" style="--sc:${scoreColor(scores[k]!)}"><span class="k">${lbl}</span><span class="v">${scores[k]!.toFixed(2)}</span></div>`).join("")}</div>
     <div class="rrcols">
       <div><p><b>Reading them together.</b> ${curSample.verdict}</p></div>
       <div><p><b>What you would do next.</b> ${curSample.fix}</p></div>
     </div>`;
  saveHash({ ...loadHash<Hash>(), sample: curSample.id });
}
$("#sampleOpts")!.innerHTML = SAMPLES.map(
  (x) => `<button data-s="${x.id}" style="--pc:${TONE[x.tone]}">${x.label}</button>`).join("");
$("#sampleOpts")!.addEventListener("click", (e) => {
  const b = (e.target as Element).closest("button");
  if (b) setSample(b.dataset["s"]!);
});
setSample(loadHash<Hash>().sample ?? SAMPLES[0]!.id);

/* ---------- the same three entities, renamed per tool ----------
   Every row is from that vendor's own docs. Where a vendor has no name for
   one of the three, say so rather than inventing one. */
const TOOLS = [
  { id: "generic",   label: "Generic",       tc: "Test case",        run: "Run",            batch: "Experiment" },
  { id: "phoenix",   label: "Arize Phoenix", tc: "Example",          run: "experiment run", batch: "Experiment" },
  { id: "ragas",     label: "Ragas",         tc: "SingleTurnSample", run: "SingleTurnSample", batch: "EvaluationDataset" },
  { id: "deepeval",  label: "DeepEval",      tc: "Golden",           run: "LLMTestCase",    batch: "EvaluationDataset" },
  { id: "langsmith", label: "LangSmith",     tc: "Example",          run: "Run",            batch: "Experiment" },
  { id: "openai",    label: "OpenAI",        tc: "item",             run: "sample",         batch: "run" },
  { id: "anthropic", label: "Anthropic",     tc: "task",             run: "transcript",     batch: "Evaluation suite" },
];
function setTool(id: string) {
  const t = TOOLS.find((x) => x.id === id) ?? TOOLS[0]!;
  $$("#toolOpts button").forEach((b) => b.classList.toggle("on", b.dataset["t"] === id));
  $$("[data-n]").forEach((el) => { el.textContent = (t as Record<string, string>)[el.dataset["n"]!]!; });
  $("[data-nadd]")!.textContent = `what the ${t.run} adds`;
  saveHash({ ...loadHash<Hash>(), tool: id });
}
$("#toolOpts")!.innerHTML = TOOLS.map((t) => `<button data-t="${t.id}">${markHTML(t.id, 16)}${t.label}</button>`).join("");
$("#toolOpts")!.addEventListener("click", (e) => {
  const b = (e.target as Element).closest("button");
  if (b) setTool(b.dataset["t"]!);
});
setTool(loadHash<Hash>().tool ?? "generic");

/* ---------- the two pickers, collapsed into the margin once scrolled past ----------
   Short labels only: the margin is ~190px and the full pill text does not fit. */
const MINI_PERSONA: Record<string, string> = { python: "Python", java: "Java", js: "JS/TS", dotnet: ".NET", none: "no code" };
$("#personaMini")!.insertAdjacentHTML("beforeend", PERSONAS.map(
  (x) => `<button data-p="${x.id}" title="${x.label} · ${x.fw}">${x.mk.length ? markHTML(x.mk[0]!, 14) : '<span class="sw"></span>'}${MINI_PERSONA[x.id]}</button>`).join(""));
$("#sampleMini")!.insertAdjacentHTML("beforeend", SAMPLES.map(
  (x) => `<button data-s="${x.id}" style="--pc:${TONE[x.tone]}" title="${x.label}"><span class="sw"></span>${x.short}</button>`).join(""));
PERSONAS.forEach((x) => {
  const b = $(`#personaMini [data-p="${x.id}"]`)!;
  b.style.setProperty("--pc", getComputedStyle($(`#personaOpts [data-p="${x.id}"]`)!).getPropertyValue("--pc"));
});
$("#personaMini")!.addEventListener("click", (e) => { const b = (e.target as Element).closest("button"); if (b) setPersona(b.dataset["p"]!); });
$("#sampleMini")!.addEventListener("click", (e) => { const b = (e.target as Element).closest("button"); if (b) setSample(b.dataset["s"]!); });

setPersona(curPersona);   // the margin widgets did not exist on the first call
setSample(curSample.id);

const personaBar = $(".persona")!, sampleBar = $(".samplepick")!, judgeH = $("#judge")!;
const syncMinis = () => {
  // the persona widget lives as long as the page does; the sample widget only
  // while section 07 is on screen, since nothing below it grades a sample.
  $("#personaMini")!.classList.toggle("show", personaBar.getBoundingClientRect().bottom < 0);
  $("#sampleMini")!.classList.toggle("show",
    sampleBar.getBoundingClientRect().bottom < 0 && judgeH.getBoundingClientRect().top > 40);
};
addEventListener("scroll", syncMinis, { passive: true });
addEventListener("resize", syncMinis);
syncMinis();

/* ---------- tabbed metric deep dive ---------- */
const tabsEl = $("#metricTabs");
tabsEl?.addEventListener("click", (e) => {
  const b = (e.target as Element).closest("button");
  if (!b) return;
  $$("#metricTabs button").forEach((x) => x.classList.toggle("on", x === b));
  $$(".tabpane").forEach((p) => p.classList.toggle("on", p.id === `tab-${b.dataset["tab"]}`));
  saveHash({ ...loadHash<Hash>(), metric: b.dataset["tab"] });
});
const wantTab = loadHash<Hash>().metric;
if (wantTab) tabsEl?.querySelector<HTMLElement>(`[data-tab="${wantTab}"]`)?.click();



/* ---------- 09: reliability tracks how closed the question is ----------
   x = how bounded the ask is, y = how often the same input returns the same
   answer. Both are judgement calls rather than measurements, and the axes say
   so by carrying no numbers — the claim is the ordering and the correlation,
   not any one coordinate. */
const REL = [
  { x: .05, y: .06, t: "write me a strategy doc",                lx:  14, ly:  4, an: "start" },
  { x: .20, y: .22, t: "“is this good? rate it 1–10”", lx: 14, ly: 4, an: "start",
    tag: "what critics picture", tx: 14, ty: 19, tan: "start", tone: "danger" },
  { x: .38, y: .44, t: "summarise this in your own words",       lx:  14, ly:  4, an: "start" },
  { x: .62, y: .74, t: "is this a fact about returns?",          lx:   0, ly: 22, an: "middle" },
  { x: .80, y: .874, t: "“list the standalone statements”", lx: -14, ly: 4, an: "end",
    tag: "call 1", tx: 13, ty: 4, tan: "start", tone: "good" },
  { x: .93, y: .99, t: "“which of these appear in the context?”", lx: -14, ly: 4, an: "end",
    tag: "call 2", tx: 13, ty: 4, tan: "start", tone: "good" },
];
const relX = (v: number) => 110 + v * 740;
const relY = (v: number) => 262 - v * 222;
$("#relDots")!.innerHTML = REL.map((d) => {
  const x = relX(d.x), y = relY(d.y), big = !!d.tag;
  const c = d.tone === "danger" ? "var(--danger)" : d.tone === "good" ? "var(--good)" : "var(--muted)";
  const tag = d.tag
    ? `<text x="${x + d.tx!}" y="${y + d.ty!}" text-anchor="${d.tan}"
         style="font-size:9.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;fill:${c}">${d.tag}</text>` : "";
  return `<g data-viz-id="rel-${Math.round(d.x * 100)}" data-label="${d.t.replace(/"/g, "&quot;")}">
    ${big ? `<circle cx="${x}" cy="${y}" r="13" fill="${c}" opacity=".18"/>` : ""}
    <circle cx="${x}" cy="${y}" r="${big ? 6.5 : 5}" fill="${c}"/>
    <text x="${x + d.lx}" y="${y + d.ly}" text-anchor="${d.an}"
          style="font-size:11.5px;fill:${big ? "var(--text)" : "var(--muted)"};font-weight:${big ? 700 : 400}">${d.t}</text>
    ${tag}</g>`;
}).join("");

/* ---------- 06: the engagement as a stepper ----------
   Five steps, and the point of the section is that the fourth one is where
   building starts. Walking the rail makes that structural instead of stated:
   the "the application" slot sits empty and dashed through steps 1-3, so the
   reader watches three things get defined before anything exists to test. */
const ART: Record<string, [string, string]> = {
  set:    ["The golden set",   '<g><rect x="4" y="6" width="46" height="9" rx="2"/><rect x="56" y="6" width="34" height="9" rx="2" opacity=".55"/><rect x="4" y="20" width="46" height="9" rx="2"/><rect x="56" y="20" width="34" height="9" rx="2" opacity=".55"/><rect x="4" y="34" width="46" height="9" rx="2"/><rect x="56" y="34" width="34" height="9" rx="2" opacity=".55"/></g>'],
  metrics:["The metrics",      '<g><rect x="4" y="8" width="62" height="8" rx="4"/><rect x="4" y="22" width="44" height="8" rx="4" opacity=".75"/><rect x="4" y="36" width="74" height="8" rx="4" opacity=".55"/></g>'],
  bar:    ["The bar, per metric", '<g><line x1="2" y1="18" x2="94" y2="18" stroke-width="1.5" stroke-dasharray="4 3"/><rect x="12" y="10" width="14" height="30" rx="2"/><rect x="40" y="22" width="14" height="18" rx="2" opacity=".6"/><rect x="68" y="4" width="14" height="36" rx="2" opacity=".8"/></g>'],
  app:    ["The application",  '<g><rect x="6" y="6" width="84" height="38" rx="4" fill="none" stroke-width="1.6"/><line x1="6" y1="16" x2="90" y2="16" stroke-width="1.2"/><circle cx="12" cy="11" r="2"/><circle cx="20" cy="11" r="2"/><rect x="14" y="24" width="40" height="5" rx="2.5"/><rect x="14" y="33" width="58" height="5" rx="2.5" opacity=".6"/></g>'],
  graph:  ["The trend",        '<g><polyline points="4,38 20,30 34,33 50,20 66,22 82,10" fill="none" stroke-width="2"/><circle cx="82" cy="10" r="3.5"/><line x1="2" y1="44" x2="94" y2="44" stroke-width="1"/></g>'],
};
const ART_ORDER = ["set", "metrics", "bar", "app", "graph"];
const STEPS = [
  { t: "Gather the golden dataset", sub: "the SME writes it", short: "Golden dataset", tone: "c4", has: ["set"],
    body: `The ~10+ SME-verified input/output pairs from the section above. This is the move you already know from TDD &mdash; <b>the tests come first.</b>` },
  { t: "Define your measurements", sub: 'what "good" means here', short: "Pick the metrics", tone: "c4", has: ["set","metrics"],
    body: `Pick the handful that mean "good" <i>for this solution</i>. Two usually carry the weight: <b>is it right?</b> and <b>is it making things up?</b> Definitions are one section down.` },
  { t: "Define a go-to-prod minimum — <i>per metric</i>", sub: "per metric, with the partner", short: "Agree the bar", tone: "c4", has: ["set","metrics","bar"],
    body: `Agree the threshold each score must clear to ship. <b>They are not the same number.</b> Hallucination (Faithfulness) might demand <span class="gate">≥ 95%</span> while a softer metric is fine at <span class="gate">≥ 60–80%</span>. The bar matches how much that behaviour matters, and it is agreed up front, with the partner, so "done" is contractual rather than a vibe.<br><br>This is your <b>CI gate</b>, moved: instead of every test passing, every metric clears <i>its own</i> threshold.` },
  { t: "Now — finally — build the thing", sub: "first line of app code", short: "Build the app", tone: "good", has: ["set","metrics","bar","app"],
    body: `Only now do you write the AI application. <b>Up to this point there was no app code at all</b> &mdash; three things were defined and nothing was built. But now you have a precise, measurable definition of success to build <i>toward</i>.` },
  { t: "Iterate against the graph", sub: "measure, milestone, repeat", short: "Iterate on the graph", tone: "accent", has: ["set","metrics","bar","app","graph"],
    body: `Every change is a hypothesis. Measure constantly, and drop a <b>milestone</b> on the trend each time you change something &mdash; that is what ties a movement to its cause. This step does not end.` },
];
const TONEVAR: Record<string, string> = { c4: "var(--c4)", good: "var(--good)", accent: "var(--accent)" };
let curStep = 0;

const NODE_X = [150, 296, 442, 600, 762];
$("#procNodes")!.innerHTML = STEPS.map((st, i) => {
  const x = NODE_X[i], big = i === 3, r = big ? 17 : 14, c = TONEVAR[st.tone];
  return `<g class="pnode" data-step="${i}" role="button" tabindex="0" aria-label="Step ${i + 1}: ${st.short}">
    <circle class="hit" cx="${x}" cy="56" r="26" fill="transparent"/>
    <circle class="ring" cx="${x}" cy="56" r="${r}" fill="var(--bg)" stroke="${c}" stroke-width="${big ? 2 : 1.6}"/>
    <text x="${x}" y="${big ? 61 : 60}" text-anchor="middle" style="font-size:${big ? 13 : 11.5}px;font-weight:700;fill:${c}">${i + 1}</text>
    <text x="${x}" y="${big ? 99 : 96}" text-anchor="middle" style="font-weight:700;fill:${st.tone === "c4" ? "var(--text)" : c}">${st.short}</text>
    <text x="${x}" y="${big ? 112 : 109}" text-anchor="middle" style="font-size:10px;fill:var(--muted)">${st.sub}</text>
  </g>`;
}).join("");

function setStep(i: number) {
  curStep = (i + STEPS.length) % STEPS.length;
  const st = STEPS[curStep]!;
  $$("#procNodes .pnode").forEach((g, k) => g.classList.toggle("on", k === curStep));
  $("#stepNow")!.innerHTML = ART_ORDER.map((k) => {
    const have = st.has.includes(k), [label, art] = ART[k]!;
    return `<div class="slot ${have ? "have" : "empty"}">
      <svg viewBox="0 0 96 48" aria-hidden="true">${have ? art : '<rect x="4" y="5" width="88" height="38" rx="5" fill="none" stroke-dasharray="4 4"/>'}</svg>
      <span>${have ? label : (k === "app" ? "no app code yet" : "not yet")}</span>
    </div>`;
  }).join("");
  $("#stepBody")!.innerHTML =
    `<div class="sbh"><span class="sbn" style="--tc:${TONEVAR[st.tone]}">${curStep + 1}</span>
       <h5 style="color:${st.tone === "c4" ? "var(--text)" : TONEVAR[st.tone]}">${st.t}</h5>
       <span class="sbnav"><button type="button" data-d="-1" aria-label="Previous step">&lsaquo;</button>
       <b>${curStep + 1} / ${STEPS.length}</b>
       <button type="button" data-d="1" aria-label="Next step">&rsaquo;</button></span></div>
     <p>${st.body}</p>`;
}
$("#procNodes")!.addEventListener("click", (e) => {
  const g = (e.target as Element).closest<SVGGElement>(".pnode"); if (g) setStep(+g.dataset["step"]!);
});
$("#procNodes")!.addEventListener("keydown", (e) => {
  const g = (e.target as Element).closest<SVGGElement>(".pnode");
  if (g && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); setStep(+g.dataset["step"]!); }
});
$("#stepBody")!.addEventListener("click", (e) => {
  const b = (e.target as Element).closest<HTMLElement>("button[data-d]"); if (b) setStep(curStep + +b.dataset["d"]!);
});
setStep(0);

/* ---------- 02: re-ask the same question ----------
   Every line below is a correct answer and none of them is the ground truth
   string the assertion compares against, so the verdict underneath ("three
   correct answers, three failures") holds for any three the button lands on. */
const ANSWERS = [
  "You've got 365 days to return any item.",
  "Our return window is a full year — 365 days from purchase.",
  "Returns are accepted for up to 365 days. Happy to help!",
  "You can send anything back within 365 days of buying it.",
  "No rush — returns stay open for a full 365 days.",
  "Items may be returned at any point in the 365 days after the order.",
  "We take returns for one year (365 days) from the order date.",
  "Anything you buy can go back for up to 365 days.",
];
const pick3 = (arr: string[]) => {
  const pool = [...arr], out: string[] = [];
  while (out.length < 3) out.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
  return out;
};
$("#rollans")?.addEventListener("click", () => {
  $(".outs")!.innerHTML = pick3(ANSWERS).map((t, i) =>
    `<div class="out fresh" style="animation-delay:${i * 80}ms"><span class="ok">✓ correct</span><span class="run">run ${i + 1}</span><br>"${t}"</div>`).join("");
});

/* ---------- 09: ten noisy runs, one steady average ----------
   Built once and mutated on re-roll rather than redrawn, so CSS can tween cy
   and the reader sees the dots move. The spread is wide on purpose (individual
   runs land anywhere from ~0.55 to 1.00) while the mean of ten barely leaves
   0.85–0.92 — that gap is the entire argument for scoring a set, not a run. */
const AGG_N = 10, AGG_TRUE = 0.88;
const aggY = (v: number) => 176 - v * 142;                 // 0 → 176, 1.0 → 34
const aggX = (i: number) => 140 + i * 38;                  // ten dots, 140 … 482
const rollScore = () => Math.max(0.3, Math.min(1, Math.round((AGG_TRUE + (Math.random() - 0.5) * 0.56) * 20) / 20));
const aggHist: number[] = [];
let aggDots: SVGElement[] = [], aggVals: number[] = [], aggMeanG: SVGElement | null = null, aggMeanTxt: SVGElement | null = null, aggPct: SVGElement | null = null;
let aggHistG: SVGElement | null = null, aggSpreadG: SVGElement | null = null, aggMeanBand: SVGElement | null = null, aggMeanSpreadTxt: SVGElement | null = null;

function buildAggPlot() {
  const sv = $("#aggplot");
  if (!sv) return;
  const mk = (n: string, a: Record<string, string | number>, t?: string) => { const e = el(n, a, t); sv.appendChild(e); return e; };

  mk("text", { x: 0, y: 14, style: "font-size:10.5px;font-weight:700;fill:var(--warn);letter-spacing:.08em" }, "ONE RUN AT A TIME");
  mk("text", { x: 900, y: 14, "text-anchor": "end", style: "font-size:10.5px;font-weight:700;fill:var(--accent);letter-spacing:.08em" }, "THE WHOLE SUITE");

  mk("line", { x1: 86, y1: 30, x2: 86, y2: 180, stroke: "var(--border)" });
  ([[1, "1.0"], [0.5, "0.5"], [0, "0"]] satisfies [number, string][]).forEach(([v, lbl]) => {
    mk("line", { x1: 82, y1: aggY(v), x2: 86, y2: aggY(v), stroke: "var(--border)" });
    mk("text", { x: 77, y: aggY(v) + 4, "text-anchor": "end", style: "font-size:10px;fill:var(--muted)" }, lbl);
  });
  mk("line", { x1: 86, y1: 180, x2: 500, y2: 180, stroke: "var(--border)" });
  mk("text", { x: 330, y: 195, "text-anchor": "middle", style: "font-size:10px;fill:var(--muted)" }, "each dot is one run's Faithfulness");

  // how far the ten runs in one suite spread — the thing the average has to survive
  aggSpreadG = mk("g", {});

  aggDots = Array.from({ length: AGG_N }, (_, i) =>
    mk("circle", { class: "dot", cx: aggX(i), cy: aggY(AGG_TRUE), r: 6.5, fill: "var(--good)" }));

  // the mean line rides a <g> so one transform tween moves rule and label together
  aggMeanG = el("g", { class: "meang" });
  aggMeanG.appendChild(el("line", { x1: 86, y1: 0, x2: 500, y2: 0, stroke: "var(--accent)", "stroke-width": 1.3, "stroke-dasharray": "6 4" }));
  aggMeanTxt = el("text", { x: 508, y: 4, style: "font-size:11px;font-weight:700;fill:var(--accent)" }, "");
  aggMeanG.appendChild(aggMeanTxt);

  const defs = mk("defs", {});
  const mkr = el("marker", { id: "agg-ah", viewBox: "0 0 8 8", refX: 6, refY: 4, markerWidth: 5.5, markerHeight: 5.5, orient: "auto" });
  mkr.appendChild(el("path", { d: "M0 0 L8 4 L0 8 z", fill: "var(--border)" }));
  defs.appendChild(mkr);
  mk("path", { d: "M598 105 L646 105", stroke: "var(--border)", "stroke-width": 1.4, "marker-end": "url(#agg-ah)" });
  mk("text", { x: 622, y: 96, "text-anchor": "middle", style: "font-size:9.5px;fill:var(--muted)" }, "average");

  mk("rect", { x: 664, y: 44, width: 152, height: 122, rx: 10,
    fill: "color-mix(in srgb,var(--accent) 8%,transparent)", stroke: "color-mix(in srgb,var(--accent) 45%,transparent)" });
  aggPct = mk("text", { x: 740, y: 112, "text-anchor": "middle", style: "font-size:38px;font-weight:700;fill:var(--accent)" }, "");
  mk("text", { x: 740, y: 134, "text-anchor": "middle", style: "font-size:10.5px;fill:var(--muted)" }, "mean of the 10");
  mk("text", { x: 740, y: 152, "text-anchor": "middle", style: "font-size:10px;fill:var(--muted)" }, "this is the tracked score");

  // every suite mean so far, stacked: the band they occupy is the comparison
  mk("text", { x: 852, y: 24, "text-anchor": "middle", style: "font-size:9.5px;fill:var(--muted)" }, "every suite mean");
  mk("line", { x1: 852, y1: 30, x2: 852, y2: 180, stroke: "var(--border)" });
  aggMeanBand = mk("rect", { x: 845, width: 14, rx: 3, y: 0, height: 0,
    fill: "color-mix(in srgb,var(--accent) 22%,transparent)", stroke: "color-mix(in srgb,var(--accent) 55%,transparent)" });
  aggHistG = mk("g", {});
  aggMeanSpreadTxt = mk("text", { x: 852, y: 195, "text-anchor": "middle", style: "font-size:10px;font-weight:700;fill:var(--accent)" }, "");

  sv.appendChild(aggMeanG);   // above the dots, so the rule stays readable
  rollAgg();
}

function rollAgg() {
  aggVals = Array.from({ length: AGG_N }, rollScore);
  const mean = aggVals.reduce((a, b) => a + b, 0) / AGG_N;
  aggVals.forEach((v, i) => {
    aggDots[i]!.setAttribute("cy", String(aggY(v)));
    aggDots[i]!.setAttribute("fill", v >= 0.85 ? "var(--good)" : v >= 0.6 ? "var(--warn)" : "var(--danger)");
    aggDots[i]!.setAttribute("data-label", `run ${i + 1}: ${v.toFixed(2)}`);
  });
  aggMeanG!.setAttribute("transform", `translate(0 ${aggY(mean)})`);
  aggMeanTxt!.textContent = `mean ${mean.toFixed(2)}`;
  aggPct!.textContent = `${Math.round(mean * 100)}%`;

  const lo = Math.min(...aggVals), hi = Math.max(...aggVals);
  aggSpreadG!.innerHTML = "";
  aggSpreadG!.appendChild(el("rect", { x: 92, y: aggY(hi), width: 14, height: Math.max(2, aggY(lo) - aggY(hi)),
    rx: 3, fill: "color-mix(in srgb,var(--warn) 20%,transparent)", stroke: "color-mix(in srgb,var(--warn) 55%,transparent)" }));
  aggSpreadG!.appendChild(el("text", { x: 99, y: 195, "text-anchor": "middle",
    style: "font-size:10px;font-weight:700;fill:var(--warn)" }, `spans ${(hi - lo).toFixed(2)}`));

  aggHist.push(mean);
  if (aggHist.length > 20) aggHist.shift();
  aggHistG!.innerHTML = "";
  aggHist.forEach((m, i) => aggHistG!.appendChild(el("line", {
    x1: 845, y1: aggY(m), x2: 859, y2: aggY(m), stroke: "var(--accent)",
    "stroke-width": 1.4, opacity: (0.3 + 0.7 * (i + 1) / aggHist.length).toFixed(2) })));
  const mlo = Math.min(...aggHist), mhi = Math.max(...aggHist);
  aggMeanBand!.setAttribute("y", String(aggY(mhi)));
  aggMeanBand!.setAttribute("height", String(Math.max(2, aggY(mlo) - aggY(mhi))));
  aggMeanSpreadTxt!.textContent = aggHist.length < 2 ? "roll again →" : `spans ${(mhi - mlo).toFixed(2)}`;
}
buildAggPlot();
$("#reroll")?.addEventListener("click", rollAgg);


/* ---------- 11: sources ----------
   Rendered from data so the vendor rows can reuse the same brand marks the
   switchers use, and so a dead link is one line to pull rather than a hunt
   through markup. Every url here returned 200 to a curl at build time. */
interface SourceGroup {
  g: string; wide?: boolean; cols?: boolean; mark?: string; note?: string;
  embed?: { id: string; title: string }; items: string[][];
}
const SOURCES: SourceGroup[] = [
  { g: "Source Allies — Blog Posts", wide: true, cols: true,
    items: [
      ["Turning RAG to Riches: The Golden Metrics of Metrics-Driven Development", "https://www.sourceallies.com/2024/07/turning-rag-to-riches/"],
      ["Building AI You Can Trust", "https://www.sourceallies.com/2024/06/building-ai-you-can-trust/"],
      ["Building Better Evals", "https://www.sourceallies.com/2025/12/building-better-evals"],
      ["GenAI in Production: Avoiding the POC Purgatory", "https://www.sourceallies.com/2025/10/genai-and-the-poc-purgatory"],
      ["Fine-Tuning Can Wait: What Enterprise GenAI Really Needs", "https://www.sourceallies.com/2025/06/what-enterprise-genai-really-needs"],
      ["Data First: Why Quality and Cleanliness are the Prerequisites for Generative AI", "https://www.sourceallies.com/2025/12/data-first-why-quality-and-cleanliness-are-the-prerequisites-for-generative-ai-in-manufacturing"],
    ] },
  { g: "Industry References", wide: true, cols: true,
    items: [
      ["Ragas", "https://docs.ragas.io/", "", "", "ragas"],
      ["Define success criteria and build evaluations", "https://platform.claude.com/docs/en/test-and-evaluate/develop-tests", "", "", "anthropic"],
      ["Getting Started with OpenAI Evals", "https://developers.openai.com/cookbook/examples/evaluation/getting_started_with_openai_evals", "", "", "openai"],
      ["LLM as a Judge", "https://arize.com/docs/phoenix/evaluation/concepts-evals/llm-as-a-judge", "", "", "phoenix"],
      ["Evaluation concepts", "https://docs.langchain.com/langsmith/evaluation-concepts", "", "", "langsmith"],
      ["G-Eval", "https://deepeval.com/docs/metrics-llm-evals", "", "", "deepeval"],
    ] },
  { g: "Foundational TDD & BDD — video walkthrough", wide: true,
    embed: { id: "pOUk65RtNYM", title: "Behavior Driven Development | Technically Speaking" },
    items: [] },
];

$("#srcgrid")!.innerHTML = SOURCES.map((grp) => `
  <div class="srcgroup${grp.wide ? " wide" : ""}">
    <h4>${grp.mark ? markHTML(grp.mark, 14) + " " : ""}${grp.g}</h4>
    ${grp.note ? `<span class="gnote">${grp.note}</span>` : ""}
    ${grp.embed ? `<div class="srcembed">
      <iframe src="https://www.youtube.com/embed/${grp.embed.id}" title="${grp.embed.title}" loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>
      <span class="by"><a href="https://www.youtube.com/watch?v=${grp.embed.id}" target="_blank" rel="noopener">${grp.embed.title}</a></span>
    </div>` : ""}
    ${grp.items.length ? `<ul${grp.cols ? ' class="cols"' : ""}>${grp.items.map(([t, u, d, meta, mk]) => `
      <li>${mk ? markHTML(mk, 13) + " " : ""}<a href="${u}" target="_blank" rel="noopener">${t}</a>
        ${d ? `<span> — ${d}</span>` : ""}${meta ? `<span class="by">${meta}</span>` : ""}</li>`).join("")}
    </ul>` : ""}
  </div>`).join("");

/* ---------- sticky chapter rail ---------- */
const chapters: [string, string][] = [
  ["lineage","Lineage"], ["problem","The break"], ["solved","Two doors"], ["what-mdd","What MDD is"],
  ["dataset","Golden set"], ["process","The process"], ["executing","Executing"], ["deepdive","Deep dive"],
  ["judge","LLM as judge"], ["milestones","The graph"], ["sources","Sources"],
];
$("#rail")!.innerHTML = chapters.map(([id,lbl]) =>
  `<a href="#${id}" data-id="${id}"><span class="lbl">${lbl}</span><span class="dot"></span></a>`).join("");
const railLinks = new Map($$("#rail a").map((a): [string | undefined, HTMLElement] => [a.dataset["id"], a]));
const io = new IntersectionObserver((ents) => {
  ents.forEach(e => {
    if (e.isIntersecting) {
      railLinks.forEach(a => a.classList.remove("on"));
      railLinks.get(e.target.id)?.classList.add("on");
    }
  });
}, { rootMargin: "-45% 0px -50% 0px" });
chapters.forEach(([id]) => { const el = document.getElementById(id); if (el) io.observe(el); });

/* ---------- milestone trend chart ---------- */
// x = time (daily measurements). Milestones = vertical event lines. Each metric has its OWN threshold.
const METRICS = [
  { key:"Faithfulness", color:"var(--c4)", thr:95 },
  { key:"Correctness",  color:"var(--c2)", thr:80 },
  { key:"Retrieval",    color:"var(--c5)", thr:70 },
];
const DAYS = 30;
// milestones: the day a change was made, and the level each metric settles to AFTER it.
// index 0 in each LEVELS array = the pre-milestone baseline.
const MILESTONES = [
  { day:3,  m:"M1", label:"Ingest the corpus",          note:"There's finally real text to cite — grounding and retrieval jump." },
  { day:8,  m:"M2", label:"Tune the system prompt",      note:"Force 'answer only from cited context.' Faithfulness climbs." },
  { day:13, m:"M3", label:"Add GraphRAG (multi-hop)",    note:"Links gear-care to warranty — the hard multi-hop samples start passing." },
  { day:17, m:"M4", label:"Swap to a smaller judge",     note:"REGRESSION — the app never changed; the weaker judge mis-scores grounded answers." },
  { day:20, m:"M5", label:"Bigger judge (gemma4:12b)",   note:"Stronger judge over full context — Faithfulness recovers and clears its line." },
  { day:26, m:"M6", label:"RAPTOR + final tuning",       note:"Global-summary retrieval + final polish — every metric holds above its own bar." },
];
const LEVELS: Record<string, number[]> = {
  Faithfulness:[35,60,72,78,64,90,96],
  Correctness :[10,38,55,70,69,79,88],
  Retrieval   :[ 5,72,76,85,85,86,90],
};
const segForDay = (d: number) => MILESTONES.reduce((s,m)=> d >= m.day ? s+1 : s, 0); // 0..6
const wiggle = (d: number,seed: number)=> 2.0*Math.sin(d*0.9 + seed*2.3) + 1.1*Math.sin(d*2.1 + seed); // deterministic
const valAt = (key: string,d: number) => Math.max(1, Math.min(99, LEVELS[key]![segForDay(d)]! + wiggle(d, key.length)));

const W=900, H=410, L=52, Rp=128, T=22, Bm=64;          // Rp leaves room for right-side threshold labels
const plotW = W-L-Rp, plotH = H-T-Bm;
const x = (d: number) => L + (d/DAYS)*plotW;
const y = (v: number) => T + (1-v/100)*plotH;
const NS = "http://www.w3.org/2000/svg";
const mk = (n: string,a: Record<string, string | number>,txt?: string)=>{ const e=document.createElementNS(NS,n); for(const k in a) e.setAttribute(k,String(a[k])); if(txt!=null) e.textContent=txt; return e; };
const svg = $("#chart")!;

// gridlines + y labels
for (let v=0; v<=100; v+=20){
  svg.appendChild(mk("line",{x1:L,y1:y(v),x2:L+plotW,y2:y(v),stroke:"var(--border)","stroke-width":v===0?1.5:1,opacity:v===0?1:.45}));
  svg.appendChild(mk("text",{x:L-8,y:y(v)+4,"text-anchor":"end",fill:"var(--muted)","font-size":"11","font-family":"var(--mono)"}, v+"%"));
}
// x time ticks
for (let d=0; d<=DAYS; d+=6){
  svg.appendChild(mk("text",{x:x(d),y:H-Bm+18,"text-anchor":"middle",fill:"var(--muted)","font-size":"10.5","font-family":"var(--mono)"}, "day "+d));
}
svg.appendChild(mk("text",{x:L+plotW/2,y:H-Bm+38,"text-anchor":"middle",fill:"var(--muted)","font-size":"10.5","font-family":"var(--sans)","letter-spacing":".1em"}, "TIME · measured daily + ad hoc"));

// final "all clear" go-live band (after last milestone, once every metric is above its line)
const goLiveDay = MILESTONES[MILESTONES.length-1]!.day;
svg.appendChild(mk("rect",{x:x(goLiveDay),y:T,width:x(DAYS)-x(goLiveDay),height:plotH,fill:"color-mix(in srgb, var(--good) 9%, transparent)"}));
svg.appendChild(mk("text",{x:(x(goLiveDay)+x(DAYS))/2,y:T+plotH-10,"text-anchor":"middle",fill:"var(--good)","font-size":"10","font-weight":"700","letter-spacing":".08em",opacity:".9"}, "ALL CLEAR → SHIP"));

// per-metric threshold lines (each in its own colour) + right-edge labels
METRICS.forEach(m=>{
  svg.appendChild(mk("line",{x1:L,y1:y(m.thr),x2:L+plotW,y2:y(m.thr),stroke:m.color,"stroke-width":1.5,"stroke-dasharray":"5 5",opacity:.55}));
  svg.appendChild(mk("text",{x:L+plotW+8,y:y(m.thr)+4,fill:m.color,"font-size":"10.5","font-family":"var(--sans)","font-weight":"700"}, `${m.key} ≥ ${m.thr}%`));
});

// milestone vertical event lines + badges
MILESTONES.forEach(ms=>{
  svg.appendChild(mk("line",{x1:x(ms.day),y1:T,x2:x(ms.day),y2:T+plotH,stroke:"var(--accent)","stroke-width":1.2,"stroke-dasharray":"3 4",opacity:.5,"data-viz-id":`milestone-${ms.m}`,"data-label":`${ms.m} ${ms.label}`}));
  svg.appendChild(mk("text",{x:x(ms.day),y:T-6,"text-anchor":"middle",fill:"var(--accent)","font-size":"10.5","font-family":"var(--mono)","font-weight":"700"}, ms.m));
});

// metric lines + dots (animated draw-in)
METRICS.forEach(m=>{
  let d="";
  for (let day=0; day<=DAYS; day++){ d += (day?"L":"M") + x(day).toFixed(1) + "," + y(valAt(m.key,day)).toFixed(1) + " "; }
  const path = mk("path",{d,fill:"none",stroke:m.color,"stroke-width":2.4,"stroke-linejoin":"round","stroke-linecap":"round","data-viz-id":`line-${m.key}`}) as SVGPathElement;
  svg.appendChild(path);
  const len = path.getTotalLength();
  path.style.strokeDasharray = String(len); path.style.strokeDashoffset = String(len);
  path.style.transition = "stroke-dashoffset 1.2s ease-out";
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ path.style.strokeDashoffset = String(0); }));
  for (let day=0; day<=DAYS; day++){
    svg.appendChild(mk("circle",{cx:x(day),cy:y(valAt(m.key,day)),r:1.8,fill:m.color,opacity:.7}));
  }
});

// hover: nearest day → guide line + tooltip
const guide = mk("line",{x1:0,y1:T,x2:0,y2:T+plotH,stroke:"var(--text)","stroke-width":1,opacity:0});
svg.appendChild(guide);
const tip = $("#tip")!, wrap = $("#chartwrap")!;
const overlay = mk("rect",{x:L,y:T,width:plotW,height:plotH,fill:"transparent",style:"cursor:crosshair"});
svg.appendChild(overlay);
overlay.addEventListener("mousemove", (ev)=>{
  const r = svg.getBoundingClientRect();
  const sx = (ev.clientX - r.left) / r.width * W;          // svg-space x
  let day = Math.round((sx - L)/plotW * DAYS);
  day = Math.max(0, Math.min(DAYS, day));
  guide.setAttribute("x1", String(x(day))); guide.setAttribute("x2", String(x(day))); guide.setAttribute("opacity", ".4");
  const here = MILESTONES.find(m=>m.day===day);
  const vals = METRICS.map(m=>{
    const v = Math.round(valAt(m.key,day));
    const ok = v >= m.thr ? `<span class="ok good">▲ above ${m.thr}</span>` : `<span class="ok warn">▼ below ${m.thr}</span>`;
    return `<span><i class="d" style="background:${m.color}"></i>${m.key} ${v}%${ok}</span>`;
  }).join("");
  tip.innerHTML = `<div class="tt">Day ${day}</div>` + (here?`<div class="ms">⟂ ${here.m} · ${here.label}</div>`:``) + `<div class="vals">${vals}</div>`;
  const px = (x(day)/W) * wrap.clientWidth;
  tip.style.left = Math.min(Math.max(px - 116, 8), wrap.clientWidth - 240) + "px";
  tip.style.top = "26px";
  tip.classList.add("show");
});
overlay.addEventListener("mouseleave", ()=>{ guide.setAttribute("opacity","0"); tip.classList.remove("show"); });

// legend + milestone key
$("#legend")!.innerHTML =
  METRICS.map(m=>`<span class="li"><span class="sw" style="background:${m.color}"></span>${m.key}</span>`).join("") +
  `<span class="li dash" style="color:var(--muted)"><span class="sw"></span>per-metric go-to-prod line</span>` +
  `<span class="li ms" style="color:var(--accent)"><span class="sw"></span>milestone (a change)</span>`;
$("#mskey")!.innerHTML = MILESTONES.map(m=>`<span class="k"><b>${m.m}</b>${m.label}</span>`).join("");
