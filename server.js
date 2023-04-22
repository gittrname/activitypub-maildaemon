const SMTPServer = require('smtp-server').SMTPServer;
const simpleParser = require('mailparser').simpleParser;
const Misskey = require('misskey-js');

const apiOption = {
    origin: "https://" + process.env.API_DOMAIN,
    credential: process.env.API_TOKEN,
};

// DMをMisskeyユーザーに送る
async function sendDmNote(fromAddr, toAddr, subject, body) {
    console.log('receive mail address From=' + fromAddr + ', To=' + toAddr);

    const [username, domain] = toAddr.split('@', 2);
    const text = "@" + toAddr + "\n"
        + "件名「" + subject + "」\n"
        + "-------------------------------------------\n"
        + body
        + "-------------------------------------------\n";

    // APIクライアント
    const cli = new Misskey.api.APIClient(apiOption);

    // ユーザー名からユーザーIDを取得
    userArr = await cli.request('users/search', {
        query: username,
        origin: 'local',
        limit: 1
    });
    if (userArr.length == 0) {
        console.log('Not found account. [' + toAddr + ']');
        return null;
    }

    // DMノートを作成
    meta = await cli.request('notes/create', {
        visibility: 'specified',
        visibleUserIds: [userArr[0].id],
        text: text,
        localOnly: true
    });
    console.log(meta);
    return meta;
}


// SMTPサーバー起動
const server = new SMTPServer({
    // STARTTLSコマンドを無効化
    disabledCommands: ['STARTTLS'],
    // 認証なし
    authOptional: true,
    // 受信アドレスを確認する
    onRcptTo(address, session, callback) {
        var [username, domain] = address.address.split('@', 2);

        if (domain !== process.env.API_DOMAIN) {
            return callback(
                new Error("'" + domain + "' is not accepted.")
            );
        }
        return callback();
    },
    // データ受信処理
    onData(source, session, callback) {
        simpleParser(source)
            .then(function(mail) {

                // アドレス一覧取得
                toAddrs = mail.to.value;

                // Promiseオブジェクト生成
                let promises = [];
                toAddrs.forEach(function(to) {
                    promises.push(
                        sendDmNote(mail.from.text, to.address, mail.subject, mail.text)
                    );
                });

                // 一気に送る
                return Promise.all(promises);
            })
            .catch(function(err) {
                return callback(err);
            });
        source.on('end', callback);
    }
});

server.listen(25)
    .on('error',  function(err) {
        console.log(err.name, err.message, err.stack);
    });
