// ============================================================================
// 📺 BANCO DE DADOS LOCAL (CANAIS EMBUTIDOS NO APP)
// ============================================================================
const LISTA_LOCAL_APP = [
    // GLOBO, RECORD, BAND, SBT, REDETV
    { id: "1001", nome: "Globo SP HD", logo: "https://i.imgur.com/waZJG1M.png", categoria: "Canais | GLOBO", tipo: "tv", streamUrl: "http://79.127.238.228:14211/" },
    { id: "1002", nome: "RecordTV SP HD", logo: "https://i.imgur.com/lyQ1v9M.png", categoria: "Canais | RECORD TV", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/recordtvhd/chunks.m3u8" },
    { id: "1003", nome: "Band SP HD", logo: "https://i.imgur.com/nCJNjyN.png", categoria: "Canais | BAND TV", tipo: "tv", streamUrl: "https://sinalpublictv.vercel.app/bandplay/k5NtnzZViMrWiHCLTEu/index.m3u8" },
    { id: "1004", nome: "+SBT HD", logo: "https://i.imgur.com/KO1v3pS.png", categoria: "Canais | SBT", tipo: "tv", streamUrl: "https://cr7v.short.gy/25mensais/s2/Whats7591634025.m3u8" },
    { id: "1005", nome: "RedeTV!", logo: "https://i.imgur.com/EgKx2J1.png", categoria: "Canais | ABERTO", tipo: "tv", streamUrl: "https://cdn.jmvstream.com/w/AVJ-15235/playlist/chunklist.m3u8" },

    // SPORTV E ESPN
    { id: "2001", nome: "SporTV HD", logo: "https://i.imgur.com/bwqLqyg.png", categoria: "Canais | SporTV", tipo: "tv", streamUrl: "https://cr7v.short.gy/manoiTVOP3/sptvxtra2/75991634025/index.m3u8" },
    { id: "2002", nome: "SporTV 2 HD", logo: "https://i.imgur.com/ZpjPkqS.png", categoria: "Canais | SporTV", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/sportv2/chunks.m3u8" },
    { id: "2003", nome: "SporTV 3 HD", logo: "https://i.imgur.com/ttHpdGp.png", categoria: "Canais | SporTV", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/sportv3/chunks.m3u8" },
    { id: "2004", nome: "ESPN HD", logo: "https://i.imgur.com/CkoAvYH.png", categoria: "Canais | ESPN", tipo: "tv", streamUrl: "https://cr7v.short.gy/live25/spn/Index.m3u8" },
    { id: "2005", nome: "ESPN 2 HD", logo: "https://i.imgur.com/ZAHnoPh.png", categoria: "Canais | ESPN", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/espn2hd/chunks.m3u8" },
    { id: "2006", nome: "ESPN 3 HD", logo: "https://i.imgur.com/VCPTlBD.png", categoria: "Canais | ESPN", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/espn3hd/chunks.m3u8" },
    { id: "2007", nome: "ESPN 4 HD", logo: "https://i.imgur.com/ErWFVO3.png", categoria: "Canais | ESPN", tipo: "tv", streamUrl: "http://46.151.196.223:14450/" },
    { id: "2008", nome: "ESPN 5 HD", logo: "https://i.imgur.com/Zz2VFpL.png", categoria: "Canais | ESPN", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/espn5hd/chunks.m3u8" },
    { id: "2009", nome: "ESPN 6 HD", logo: "https://i.imgur.com/Zz2VFpL.png", categoria: "Canais | ESPN", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/espn6hd/chunks.m3u8" },

    // LUTAS E PREMIERE
    { id: "3001", nome: "Combate HD", logo: "https://i.imgur.com/HIiZUQN.png", categoria: "Canais | LUTAS", tipo: "tv", streamUrl: "http://79.127.238.233:14408/" },
    { id: "3002", nome: "UFC Fightpass HD", logo: "https://i.imgur.com/AvV9rW9.png", categoria: "Canais | LUTAS", tipo: "tv", streamUrl: "https://cr7v.short.gy/manofree/UFC/tracks-v2a1/mono.m3u8" },
    { id: "3003", nome: "Premiere Clubes HD", logo: "https://i.imgur.com/T6VmjYB.png", categoria: "Canais | PREMIERE", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz:80/huan/premiereclubeshd/playlist.m3u8" },
    { id: "3004", nome: "Premiere 2 HD", logo: "https://i.imgur.com/Sa86nNV.png", categoria: "Canais | PREMIERE", tipo: "tv", streamUrl: "http://104.238.222.251:8989/278940_.m3u8" },
    { id: "3005", nome: "Premiere 3 HD", logo: "https://i.imgur.com/vdKC1eu.png", categoria: "Canais | PREMIERE", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz:80/huan/premiere3hd/playlist.m3u8" },
    { id: "3006", nome: "Premiere 4 HD", logo: "https://i.imgur.com/n5KKEiL.png", categoria: "Canais | PREMIERE", tipo: "tv", streamUrl: "http://104.238.222.251:8989/278934_.m3u8" },
    { id: "3007", nome: "Premiere 5 HD", logo: "https://i.imgur.com/qVVCNKG.png", categoria: "Canais | PREMIERE", tipo: "tv", streamUrl: "http://104.238.222.251:8989/278935_.m3u8" },
    { id: "3008", nome: "Premiere 6 HD", logo: "https://i.imgur.com/4CAJWni.png", categoria: "Canais | PREMIERE", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz:80/huan/premiere6hd/playlist.m3u8" },
    { id: "3009", nome: "Premiere 7 HD", logo: "https://i.imgur.com/XqTjkAw.png", categoria: "Canais | PREMIERE", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz:80/huan/premiere7hd/playlist.m3u8" },

    // YOUTUBE, DAZN E DISNEY
    { id: "4001", nome: "CazéTV HD", logo: "https://i.imgur.com/oJJ8AAI.png", categoria: "Canais | ESPORTES", tipo: "tv", streamUrl: "https://dfr80qz435crc.cloudfront.net/MNOP/Amagi/Caze/Caze_TV_BR/720p-vtt/index.m3u8" },
    { id: "4002", nome: "Canal GOAT 1 HD", logo: "https://i.imgur.com/KlMpCWS.png", categoria: "ao vivo | FUTEBOL", tipo: "tv", streamUrl: "" },
    { id: "4003", nome: "Canal GOAT 2 HD", logo: "https://i.imgur.com/KlMpCWS.png", categoria: "ao vivo | FUTEBOL", tipo: "tv", streamUrl: "" },
    { id: "4004", nome: "DAZN 1 HD", logo: "http://beststorage4you.com:80/logoscanais/DAZN.png", categoria: "Canais | PPV ESPORTES", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/dazn1/chunks.m3u8" },
    { id: "4005", nome: "DAZN 2 HD", logo: "http://beststorage4you.com:80/logoscanais/DAZN.png", categoria: "Canais | PPV ESPORTES", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/dazn2/chunks.m3u8" },
    { id: "4006", nome: "Disney+ 1", logo: "https://i.imgur.com/3jwgcNr.png", categoria: "Canais | PPV ESPORTES", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/disneyplus1/chunks.m3u8" },
    { id: "4007", nome: "Disney+ 2", logo: "https://i.imgur.com/3jwgcNr.png", categoria: "Canais | PPV ESPORTES", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/disneyplus2/chunks.m3u8" },

    // MAX E PARAMOUNT
    { id: "5001", nome: "Paramount+ HD", logo: "https://i.imgur.com/AtwQSpz.png", categoria: "Canais | PPV ESPORTES", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/paramountplus1/chunks.m3u8" },
    { id: "5002", nome: "Paramount+ 2 HD", logo: "https://i.imgur.com/AtwQSpz.png", categoria: "Canais | PPV ESPORTES", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/paramountplus2/chunks.m3u8" },
    { id: "5003", nome: "Max 1", logo: "https://i.imgur.com/JYoNKmt.png", categoria: "Canais | PPV ESPORTES", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/hbomax1/chunks.m3u8" },
    { id: "5004", nome: "Max 2", logo: "https://i.imgur.com/JYoNKmt.png", categoria: "Canais | PPV ESPORTES", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/hbomax2/chunks.m3u8" },

    // VARIEDADES E DISCOVERY
    { id: "6001", nome: "Multishow HD", logo: "https://i.imgur.com/a4lEiwk.png", categoria: "Canais | VARIEDADES", tipo: "tv", streamUrl: "http://15.235.11.7:14146/MultiShowSD" },
    { id: "6002", nome: "BIS HD", logo: "https://i.imgur.com/jvvmyCv.png", categoria: "Canais | VARIEDADES", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/bishd/chunks.m3u8" },
    { id: "6003", nome: "Comedy Central HD", logo: "https://i.imgur.com/jcgv2zs.png", categoria: "Canais | VARIEDADES", tipo: "tv", streamUrl: "http://185.236.183.117:14130/" },
    { id: "6004", nome: "Discovery Turbo HD", logo: "https://i.imgur.com/lH1Srp9.png", categoria: "Canais | VARIEDADES", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/discoveryturbohd/chunks.m3u8" },
    { id: "6005", nome: "Discovery World HD", logo: "https://i.imgur.com/6sTkahx.png", categoria: "Canais | VARIEDADES", tipo: "tv", streamUrl: "http://15.235.50.112:14112/" },
    { id: "6006", nome: "History HD", logo: "https://i.imgur.com/0rNNqVy.png", categoria: "Canais | VARIEDADES", tipo: "tv", streamUrl: "http://15.235.11.7:14132/HISTORYSD" },

    // FILMES E SERIES
    { id: "7001", nome: "SPACE HD", logo: "https://imgur.com/RxETCgZ.png", categoria: "Canais | FILMES E SERIES", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/spacehd/chunks.m3u8" },
    { id: "7002", nome: "TNT HD", logo: "https://imgur.com/kA3ov0x.png", categoria: "Canais | FILMES E SERIES", tipo: "tv", streamUrl: "http://79.127.238.228:14629/" },
    { id: "7003", nome: "Warner Channel HD", logo: "https://imgur.com/zR0XZG7.png", categoria: "Canais | FILMES E SERIES", tipo: "tv", streamUrl: "http://79.127.238.228:14647/" },
    { id: "7004", nome: "Telecine Premium HD", logo: "https://i.imgur.com/SGr7sdL.png", categoria: "Canais | FILMES E SERIES", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/telecinepremiumhd/chunks.m3u8" },
    { id: "7005", nome: "Telecine Pipoca HD", logo: "https://imgur.com/cPTZMTo.png", categoria: "Canais | FILMES E SERIES", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/telecinepipocahd/chunks.m3u8" },
    { id: "7006", nome: "HBO HD", logo: "https://imgur.com/IKjcTJH.png", categoria: "Canais | FILMES E SERIES", tipo: "tv", streamUrl: "http://cdn.bomberstream.xyz/huan/hbohd/chunks.m3u8" },

    // 24 HORAS / COMÉDIA
    { id: "8001", nome: "🔴 Drake e Josh", logo: "https://imgur.com/BatygW5.png", categoria: "Canais | COMÉDIA", tipo: "tv", streamUrl: "http://24hrs.homelinux.com:8080/24H-drakeejosh/video.m3u8" },
    { id: "8002", nome: "🔴 Friends", logo: "https://imgur.com/BatygW5.png", categoria: "Canais | COMÉDIA", tipo: "tv", streamUrl: "http://24hrs.homelinux.com:8080/24H-friends/video.m3u8" },
    { id: "8003", nome: "🔴 Um Maluco no Pedaço 24h", logo: "https://imgur.com/BatygW5.png", categoria: "Canais | COMÉDIA", tipo: "tv", streamUrl: "http://24hrs.homelinux.com:8080/24H-ummaluconopedaco/playlist.m3u8" },
    { id: "8004", nome: "🔴 Os Trapalhões 24h", logo: "https://imgur.com/BatygW5.png", categoria: "Canais | COMÉDIA", tipo: "tv", streamUrl: "http://24hrs.homelinux.com:8080/24H-ostrapalhoes/video.m3u8" },
    { id: "8005", nome: "🔴 Todo Mundo Odeia O Cris 24h", logo: "https://imgur.com/BatygW5.png", categoria: "Canais | COMÉDIA", tipo: "tv", streamUrl: "http://24hrs.homelinux.com:8080/24H-todomundoodeiaocris/video.m3u8" }
];
