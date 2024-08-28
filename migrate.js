import mysql from "mysql";
import axios from "axios";
import cron from 'node-cron';

const conn = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "teste1",
});

conn.connect(function (err) {
  if (err) throw err;
  console.log("Conectado ao banco de dados!");
});

async function migrateImages() {
  try {
    const selectQuery =
    /*FUNCIONARIO*/
      "SELECT id_funcionario, foto FROM funcionario WHERE status = 1 and asimage = '' LIMIT 10";
    const [results] = await queryDatabase(selectQuery);

    if (results.length === 0) {
      console.log("Todas as imagens foram migradas.");
      conn.end();
      return;
    }

    for (let row of results) {
      try {

        let image = row.foto;

        if (Buffer.isBuffer(image)) {
          image = image.toString("utf-8");
        }

        const cliente = row.id_funcionario;
        const tipo = "funcionario";

        const uploadResponse = await axios.post(
          "http://asimage.online/migrate",
          {
            image,
            idCliente: cliente,
            type: tipo,
          }
        );

        if (uploadResponse.data.error === false) {
          const fileNameOriginal = (uploadResponse.data.fileNameOriginal).replace("-original.webp", "");
          const asImage = `${fileNameOriginal}`;
          const updateQuery =
            "UPDATE funcionario SET asimage = ? WHERE id_funcionario = ?";
          await queryDatabase(updateQuery, [asImage, row.id_funcionario]);
          console.log(
            `Imagem migrada! Nome do arquivo: ${fileNameOriginal}`
          );
        } else {
          console.error(
            `Erro ao migrar a imagem: ${uploadResponse.data.errorMessage}`
          );
        }
      } catch (error) {
        console.error(`Erro ao migrar a imagem:`, error.message);
      }
    }
  } catch (error) {
    console.error("Erro ao migrar imagens:", error.message);
    conn.end();
  }
}

function queryDatabase(query, params) {
  return new Promise((resolve, reject) => {
    conn.query(query, params, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve([results]);
    });
  });
}

cron.schedule(
  "*/1 * * * *",
  async () => {
    await migrateImages().catch(console.error);
  },
  {
    scheduled: true,
    timezone: "America/Sao_Paulo",
  }
);


