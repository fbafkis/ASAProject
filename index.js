import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

const client = new DeliverooApi ("http://localhost:8080", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY2ZTg4OTIwMDE0IiwibmFtZSI6ImQiLCJpYXQiOjE2ODA3MjM1ODJ9.uarl_g1B9pplSfkHgtaGGW-Kf791vJd1LtdB7E3JrW0")

const start = Date.now();

const me = {};

client.onYou( ( {id, name, x, y, score} ) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
} )

function distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) )
    const dy = Math.abs( Math.round(y1) - Math.round(y2) )
    return dx + dy;
}

/**
 * @type {Map<string,[{id,name,x,y,score}]}
 */
const agent_db = new Map()

/**
 * @type {Map<string,[{id, x, y, carriedBy, reward}]}
 */
const parcel_db = new Map()

var first = true;
var second = false;
var par;
var par_starting_time;
var par_ending_time;
var time_dif;
var time_dif_round;

client.onParcelsSensing( (parcels) => {


    // Idea: If you can calculate the time it takes for decreasing its reward, you can simulate the reward of parcels out of the sensing area of the agent
    // Problem: Not exactly the 0.4, 0.6, 1.0 second steps are used for detecting parcels -> rounding errors


/*     if (second == true && (par.reward != parcels[0].reward)) {   //Second Round - Save the current time of the parcel, compare it to the starting time -> Measuring the time for reward decrease
        par_ending_time = Date.now()
        time_dif =  par_ending_time - par_starting_time
        time_dif_round = (time_dif / 100).toFixed(1)
        console.log(time_dif_round)
        time_dif = parseInt(time_dif / 1000)
        if ((time_dif_round % 1) != 0) {
            time_dif = time_dif + 1
        }
        console.log(time_dif)
        second = false
    }


    if (first == true) {        //First Round - Save data of first parcel
        par = parcels[0]
        par_starting_time = Date.now()
        first = false
        second = true
    } */

    

    for (const p of parcels) {
      
   if (!parcel_db.has(p.id)) {  //not already in database
        if (p.carriedBy == null  ) {  // not already picked up by somebody else -> Saved in Database

        parcel_db.set( p.id, [p])
    }
      } else {

        if (p.carriedBy != null) {  //check if carried by somebody -> Delete out of Database
            parcel_db.delete(p.id)
        }

        var parcel_history = parcel_db.get( p.id )
        var last = parcel_history[parcel_history.length-1]

        console.log(last)
       

        if (last.reward != p.reward) {  //update the value of the parcels
            parcel_db.set(p.id, [p])
            
        parcel_history = parcel_db.get( p.id )
         last = parcel_history[parcel_history.length-1]
        console.log(last) 
        console.log()

        continue        //Only 1 Update - Partial Steps are skipped

        }
       
         

      }


    }
       
   
   
   } )



 client.onAgentsSensing( ( agents ) => {

    for (const a of agents) {

        if ( a.x % 1 != 0 || a.y % 1 != 0 ) // skip intermediate values (0.6 or 0.4)
            continue;

        // I meet someone for the first time
        if ( ! agent_db.has( a.id) ) {

            agent_db.set( a.id, [a] )
            console.log( 'First Meeting with', a.name )

        } else { // I remember him

            // this is everything I know about him
            const history = agent_db.get( a.id )

            // this is about the last time I saw him
            const last = history[history.length-1]
            const second_last = (history.length>2 ? history[history.length-2] : 'no knowledge')
            
            if ( last != 'lost' ) { // I was seeing him also last time

                if ( last.x != a.x || last.y != a.y ) { // But he moved
                
                    history.push( a )
                    //console.log( 'I\'m seeing you moving', a.name )
                
                } else { // Still here but not moving

                }                

            } else { // I see him again after some time
                
                history.push( a )

                if ( second_last.x != a.x || second_last.y != a.y ) {
                    console.log( 'Welcome back, seems that you moved', a.name, "; Your Score is: ", a.score )
                } else {
                    console.log( 'Welcome back, seems you are still here as before', a.name, "; Your Score is: ", a.score  )
                }

            }

        }

    }

    for ( const [id,history] of agent_db.entries() ) {

        const last = history[history.length-1]
        const second_last = (history.length>1 ? history[history.length-2] : 'no knowledge')

        if ( ! agents.map( a=>a.id ).includes( id ) ) {
            // If I am not seeing him anymore
            
            if ( last != 'lost' ) {
                // Just went off

                history.push( 'lost' );
                console.log( 'Bye', last.name );

            } else {
                // A while since last time I saw him

                //Commented Code because we have to determine how relevant the code is for us

                // console.log( 'Its a while that I don\'t see', second_last.name, 'I remember him in', second_last.x, second_last.y );
                
                // if ( distance(me, second_last) <= 3 ) {
                //     console.log( 'I remember', second_last.name, 'was within 3 tiles from here. Forget him.' );
                //     agent_db.delete(id)
                // }

            }

        } else { // If I am still seing him ... see above
            // console.log( 'still seing him', last.name )
        }

    }

} ) 






// async function MyFn() {

//     let up = client.move("up");
//     up.then( (status) => console.log(status));

//     await up;

//     let right = client.move("right");
//     right.then( (status) => console.log(status));

// }
// MyFn()

// client.socket.on("you" , (me) => { 
//     console.log(me) 
// }    );