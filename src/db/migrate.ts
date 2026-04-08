// import { db } from "./index";
// import { migrate } from 'drizzle-orm/postgres-js/migrator';

// // const main = async() => {
// //     try{
// //         await migrate(db, {
// //             migrationsFolder: 'src/db/migrations'
// //         })
// //         console.log('Migration completed')
// //     } catch (error){
// //         console.error('Error durng migration: ', error)
// //         process.exit(1)
// //     }
// // }

// // main()


import 'dotenv/config';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from "path";

const main = async() => {

    
const client = postgres(process.env.DATABASE_URL!, { max: 1 });
    try{
        await migrate(drizzle(client, { logger: true }), {
            migrationsFolder: path.join(process.cwd(), "src/db/migrations"),
        });
        console.log('Migration completed')
    } catch (error){
        console.error('Error durng migration: ', error)
        process.exit(1)
    }
}

main()





// await client.end()