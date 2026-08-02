const parseDurations = text => {
  if (text === 'Out of Stock') return [];
  return [...text.matchAll(/(.+?)\s*\[Stock:\s*(\d+)\]/g)].map(match => ({
    label: match[1].trim(),
    stock: Number(match[2]),
  }));
};

const rows = [
  ['APK MC PANEL FF ROOT ANDROID', '124', '1 DaYs [Stock: 13]3 DaYs [Stock: 41]7 DaYs [Stock: 30]'],
  ['BR MOD FF PC VERSION', '49', '1 Day Pc Aim Silent [Stock: 7]1 Day Pc Bypass + Silent [Stock: 6]1 Day Pc Modmenu x86 [Stock: 5]10 Day Pc Modmenu x86 [Stock: 5]10 Days Pc Aim Silent [Stock: 6]10 Days Pc Bypass + Silent [Stock: 4]30 Day Pc Modmenu x86 [Stock: 4]30 Days Pc Aim Silent [Stock: 5]30 Days Pc Bypass + Silent [Stock: 2]'],
  ['BR MOD FF ROOT ANDROID', '67', '1 DaYs [Stock: 32]15 DaYs [Stock: 31]30 DaYs [Stock: 16]7 DaYs [Stock: 31]'],
  ['DRIPCLIENT 8BP NONROOT ANDROID', '59', '1 DaYs [Stock: 17]30 DaYs [Stock: 12]7 DaYs [Stock: 10]'],
  ['DRIPCLIENT FF NONROOT APKMOD', '62', '1 DaYS NONROOT [Stock: 205]15 DaYS NONROOT [Stock: 46]3 DaYS NONROOT [Stock: 170]30 DaYS NONROOT [Stock: 48]7 DaYS NONROOT [Stock: 94]'],
  ['DRIPCLIENT FF PC AIMKILL', '44', '1 DaYS PC AIMKILL [Stock: 1]15 DaYS PC AIMKILL [Stock: 7]30 DaYS PC AIMKILL [Stock: 7]7 DaYS PC AIMKILL [Stock: 5]'],
  ['DRIPCLIENT FF ROOT ANDROID', '63', '30 DaYS ROOT [Stock: 5]'],
  ['DRIPCLIENT PROXY FF NONROOT ANDROID', '91', '3 DaYs [Stock: 44]30 DaYs [Stock: 18]7 DaYs [Stock: 83]'],
  ['FLUORITE IOS FF', '58', '1 DAYs FluoRite FF [Stock: 15]30 DAYs FluoRite FF [Stock: 7]7 DAYs FluoRite FF [Stock: 7]'],
  ['FLUORITE IOS MLBB', '84', '1 DaYs [Stock: 2]30 DaYs [Stock: 2]7 DaYs [Stock: 2]'],
  ['HAXX-CKER PRO FF ROOT ANDROID', '64', 'Out of Stock'],
  ['HG CHEATS ANDROID PROXY FF NONROOT', '123', '1 DaYs [Stock: 207]10 DaYs [Stock: 70]30 DaYs [Stock: 41]7 DaYs [Stock: 97]'],
  ['HG CHEATS FF APKMOD NONROOT+ROOT', '65', '1 DaYs Root + Nonroot [Stock: 121]10 DaYs Root+Nonroot [Stock: 70]30 DaYs Root+Nonroot [Stock: 8]7 DaYs Root+Nonroot [Stock: 114]'],
  ['HIKARI MOD FF ROOT ANDROID', '72', '1 Days [Stock: 69]3 Days [Stock: 46]7 Days [Stock: 48]'],
  // ['IOS CLOUD CODM', '87', '30 DaYs [Stock: 2]'],
  ['IOS FLUORITE 8 BALL POOL', '86', '1 DaYs [Stock: 5]30 DaYs [Stock: 2]7 DaYs [Stock: 3]'],
  ['IOS IPHONE ALL GBOX CERTIFICATE', '85', '1 Year Ios Esign Gbox Certificate [Stock: 18]1 Year Ios Signer Gbox Certificate [Stock: 4]'],
  ['KOS 8 BALL POOL NONROOT ANDROID', '76', '1 DaYs Premium Access [Stock: 3]30 DaYs Mod [Stock: 2]30 DaYs Premium Access [Stock: 4]7 DaYs Premium Access [Stock: 14]'],
  ['KOS CARROM POOL NONROOT ANDROID', '75', '1 DaYs [Stock: 5]30 DaYs [Stock: 2]7 DaYs [Stock: 7]'],
  ['KOS FF ROOT ANDROID', '74', '1 DaYs [Stock: 5]30 DaYs [Stock: 2]7 DaYs [Stock: 3]'],
  ['MIGUL IPHONE IOS FF', '69', '1 DaYs Basic [Stock: 5]1 DaYs PRO [Stock: 1]30 DaYs Basic [Stock: 8]30 DaYs PRO [Stock: 7]7 DaYs Basic [Stock: 5]7 DaYs PRO [Stock: 3]'],
  ['PATO TEAM FF ALL ANDROID', '54', '15 DaYs All Colours Mix [Stock: 20]3 DaYs All Colours Mix [Stock: 36]30 DaYs All Colours Mix [Stock: 14]7 DaYs All Colours Mix [Stock: 42]'],
  ['PRIME HOOK FF NONROOT ANDROID', '48', '1 Days Nonroot [Stock: 300]10 Days Nonroot [Stock: 35]3 Days Nonroot [Stock: 132]7 Days NonRoot [Stock: 30]'],
  ['RAPID CORE FF ROOT ANDROID', '130', '1 DaYs [Stock: 139]14 DaYs [Stock: 45]30 DaYs [Stock: 35]7 DaYs [Stock: 100]'],
  ['REAPER X PRO FF ROOT ANDROID', '81', '10 DaYs [Stock: 26]'],
  ['SILENT CHEAT FF NONROOT APKMOD', '127', '1 DaYs [Stock: 73]14 DaYs [Stock: 38]28 DaYs [Stock: 25]3 DaYs [Stock: 134]7 DaYs [Stock: 41]'],
  ['SILENT CHEAT FF ROOT ANDROID', '128', '1 DaYs BRUTAL [Stock: 86]1 DaYs SAFE [Stock: 79]14 DaYs BRUTAL [Stock: 29]14 DaYs SAFE [Stock: 25]28 DaYs BRUTAL [Stock: 25]28 DaYs SAFE [Stock: 20]3 DaYs BRUTAL [Stock: 92]3 DaYs SAFE [Stock: 103]7 DaYs BRUTAL [Stock: 82]7 DaYs SAFE [Stock: 81]'],
  ['SNAKE 8 BALL POOL NONROOT ANDROID', '79', '10 DaYs [Stock: 3]3 DaYs [Stock: 3]30 DaYs [Stock: 2]'],
  ['SNAKE CARROM POOL NONROOT ANDROID', '77', '10 DaYs [Stock: 2]3 DaYs [Stock: 3]30 DaYs [Stock: 3]'],
  ['SNAKE SOCCER STARS NONROOT ANDROID', '78', '10 DaYs [Stock: 3]3 DaYs [Stock: 4]30 DaYs [Stock: 2]'],
  ['XYZ CHEATS FF ROOT ANDROID', '66', '1 Days [Stock: 54]15 Days [Stock: 29]3 Days [Stock: 40]30 Days [Stock: 23]7 Days [Stock: 37]'],
  ['XYZ CHEATS UNLIMITED CREDIT FOR 1 SEASON', '129', 'XYZ CHEATS UNLIMITED CREDIT [Stock: 9]'],
];

export const PRODUCT_CATALOG = rows.map(([name, pid, durations]) => ({
  name,
  pid,
  durations: parseDurations(durations),
  totalStock: parseDurations(durations).reduce((sum, item) => sum + item.stock, 0),
}));
