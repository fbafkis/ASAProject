import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

const client = new DeliverooApi(
    'http://localhost:8080',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI4NWY1MWE4ZTg4IiwibmFtZSI6ImRvZmIiLCJpYXQiOjE2OTEwNDk3NzV9.n0wlpwc5301NNDfJtxG7rs4sd9MsYTFaClHMxYD61mA')

function distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) )
    const dy = Math.abs( Math.round(y1) - Math.round(y2) )
    return dx + dy;
}

function distance_coordinates(target_x, target_y, tile_x, tile_y) {
    const dx = Math.abs( Math.round(target_x) - Math.round(tile_x) )
    const dy = Math.abs( Math.round(target_y) - Math.round(tile_y) )
    return dx + dy;
}

/**
 * Beliefset revision function
 */
const me = {};

client.onYou( ( {id, name, x, y, score} ) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score  
} )

//TODO: Try if me.carrying + me.parcel_count works as well
    
me.carrying;
me.parcel_count = 0;
var parcel_decading_interval; //String
var parcel_sensing_distance;
var max_parcels; //Integer

var current_parcel;

var patrolling_area_counter = 1;

client.onConfig((config)=>{
    parcel_decading_interval = config.PARCEL_DECADING_INTERVAL;
    parcel_sensing_distance = config.PARCELS_OBSERVATION_DISTANCE;
    max_parcels = config.PARCELS_MAX;
    me.carrying = false;
})

const map = {
    width:undefined,
    height:undefined,
    tiles: new Map(),
    add: function ( tile ) {
        const {x, y} = tile;
        return this.tiles.set( x+1000*y, tile );
    },
    xy: function (x, y) {
        return this.tiles.get( x+1000*y )
    }
};
client.onMap( (width, height, tiles) => {
    map.width = width;
    map.height = height;
    for (const t of tiles) {
        map.add( t );
    }
    select_patrolling_points();
} )

client.onTile( (x, y, delivery) => {
    map.add( {x, y, delivery} );
} )

var first = true;


/**
 * @type {Map<string,[{id,name,x,y,score}]}
 */
const agent_db = new Map()

/**
 * @type {Map<string,[{id, x, y, carriedBy, reward}]}
 */
const parcel_db = new Map()

/**
 * @type {Map<string,[{x_coordinate}]}
 */
const patrolling_x_coordinates = new Map()

/**
 * @type {Map<string,[{y_coordinate}]}
 */
const patrolling_y_coordinates = new Map()


 function select_patrolling_points() {

    let target_x;
    let target_y;
    let valid_tile;

    target_y = Math.floor(map.height / 3) + 1;
    target_x = Math.floor(map.width / 3) + 1;

    console.log("TARGET X: " + target_x)
    console.log("TARGET Y: " + target_y)

//TODO: If patrolling is specified - check if tile is undefined

    patrolling_x_coordinates.set("1", target_x);
    patrolling_y_coordinates.set("1", target_y);


    patrolling_x_coordinates.set("2", (target_x));
    patrolling_y_coordinates.set("2", (target_y * 2));
    
    patrolling_x_coordinates.set("3", (target_x * 2));
    patrolling_y_coordinates.set("3", (target_y * 2));
    
    patrolling_x_coordinates.set("4", (target_x * 2));
    patrolling_y_coordinates.set("4", (target_y ));

    return;
}

function check_patrolling_point(x, y){
    var valid_tile = false;
    for (const tile of map.tiles.values()) {
        if (tile.x == x && tile.y == y) {      
             valid_tile == true;
        }     
    }

    return valid_tile;
   }



function patrolling_case_selection(){

    let idle;

         //Check Quadrant Counter is in bounds
       if (patrolling_area_counter > 4 || patrolling_area_counter < 1) {
          patrolling_area_counter = 1;
       }

      console.log(patrolling_area_counter)
     if (patrolling_area_counter == 1) {
        idle = ['patrolling', patrolling_x_coordinates.get("1"), patrolling_y_coordinates.get("1")];
        patrolling_area_counter++;
        } else if (patrolling_area_counter == 2){
            idle = ['patrolling', patrolling_x_coordinates.get("2"), patrolling_y_coordinates.get("2")];
            patrolling_area_counter++;
             } else if (patrolling_area_counter == 3){
                idle = ['patrolling', patrolling_x_coordinates.get("3"), patrolling_y_coordinates.get("3")];     
                patrolling_area_counter++;
                } else if (patrolling_area_counter == 4){
                    idle = ['patrolling', patrolling_x_coordinates.get("4"), patrolling_y_coordinates.get("4")];
                    patrolling_area_counter++;
                    }

                 myAgent.push(idle)
}

client.onParcelsSensing( async ( perceived_parcels ) => {

    for (const p of perceived_parcels) {

        if (!parcel_db.has(p.id)) {  //not already in database

        if (p.carriedBy == null  ) {  // not already picked up by somebody else -> Saved in Database

        parcel_db.set( p.id, [p])  
    }
    } else {

        if (p.carriedBy != null) {  //check if carried by somebody -> Delete out of Database
            parcel_db.delete(p.id)
        }
    }
}
} )




/**
 * Options generation and filtering function
 */
client.onParcelsSensing( parcels => {

    // TODO revisit beliefset revision so to trigger option generation only in the case a new parcel is observed

  
    /**
     * Options generation
     */
    const options = []
 

    if (parcel_decading_interval == "infinite" && me.parcel_count < max_parcels){
    for (const parcel of parcels.values()) {
        if ( ! parcel.carriedBy )
            options.push( [ 'go_pick_up', parcel.x, parcel.y, parcel.id ] );
            } }  else if (parcel_decading_interval == "infinite" && me.parcel_count >= max_parcels) {
        for (const tile of map.tiles.values()) {
            if (tile.delivery) {      
                 options.push( [ 'go_put_down', tile.x, tile.y, tile.delivery ] );
            }     
        }
    }

/* for (const option of options) { //Checking all available Options -> Later Version delete it
    console.log(option)
} */

    /**
     * Options filtering
     */
    let best_option;
    
    //distance Decision Function

 let nearest = Number.MAX_VALUE; 
 /*    
    for (const option of options) {
        if ( option[0] == 'go_pick_up' ) {
            let [go_pick_up,x,y,id] = option;
          
            let current_d = distance( {x, y}, me )       
            if ( current_d < nearest ) {
                best_option = option
                nearest = current_d
            }
 */
            // Reward Decision Function
            let highest_value = 0;
            for (const option of options) {
                if ( option[0] == 'go_pick_up' ) {
                    let [go_pick_up,x,y,id] = option;
                    let parcel = parcel_db.get(id)
                    if (parcel.reward > highest_value)
                    highest_value = parcel.reward;
                    best_option = option;

        } else if (option[0] == 'go_put_down' ) {
            let [go_put_down,x,y,delivery] = option;
            let current_d = distance( {x, y}, me )
            if ( current_d < nearest ) {
                best_option = option
                nearest = current_d
            }
        }
    }

    
   

    /**
     * Best option is selected
     */
    if ( best_option ) {
       // console.log(best_option)
        if(best_option[0] == "go_pick_up") 
        current_parcel = parcel_db.get(best_option.id)
        myAgent.push( best_option )
    }

} )

client.onAgentsSensing( ( agents ) => {

    for (const a of agents) {

        if ( a.x % 1 != 0 || a.y % 1 != 0 ) // skip intermediate values (0.6 or 0.4)
            continue;

        // I meet someone for the first time
        if ( ! agent_db.has( a.id) ) {

            agent_db.set( a.id, [a] )

        } else { // I remember him

            // this is everything I know about him
            const history = agent_db.get( a.id )

            // this is about the last time I saw him
            const last = history[history.length-1]
            const second_last = (history.length>2 ? history[history.length-2] : 'no knowledge')
            
            if ( last != 'lost' ) { // I was seeing him also last time

                if ( last.x != a.x || last.y != a.y ) { // But he moved
                
                    history.push( a )
                
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

            } 

        } 

    }

} ) 



/**
 * Intention revision loop
 */
class IntentionRevision {

    #intention_queue = new Array();
    get intention_queue () {
        return this.#intention_queue;
    }

    async loop ( ) {
        while ( true ) {
           // console.log("Parcel Count:" + me.parcel_count)
             console.log("IQ: " + this.intention_queue.length)
            console.log("ME CARRYING " + me.carrying)
            console.log("PARCEL DB ")
            console.log(parcel_db)

            // Consumes intention_queue if not empty
            if ( this.intention_queue.length > 0 ) {
                console.log( 'intentionRevision.loop', this.intention_queue.map(i=>i.predicate) );
               
                // Current intention
                const intention = this.intention_queue[0];
                
               // console.log("pred[0]: " + intention.predicate[2]);

                if(intention.predicate != "patrolling") {
                // Is queued intention still valid? Do I still want to0 achieve it?
                // TODO this hard-coded implementation is an example -> FUTURE SELFS: Add case for Put Down
                let id = intention.predicate[2]
                let p = parcel_db.get(id)
                if ( p && p.carriedBy ) {
                    console.log( 'Skipping intention because no more valid', intention.predicate )
                    continue;
                }
                }
                // Start achieving intention
             
                await intention.achieve()
                // Catch eventual error and continue
               .catch( error => {
                    // console.log( 'Failed intention', ...intention.predicate, 'with error:', ...error )
                    console.log(error);
                } );

                //console.log(this.intention_queue.length)

                // Remove from the queue
                this.intention_queue.shift();

              
               // console.log("Intention Queue before if -> Parcel Count: " + me.parcel_count)
                if (this.#intention_queue.length == 0 && me.parcel_count == max_parcels) {

                    console.log("GOES IN DELIVERY IF!")
                    const delivery_options = [];
                    let best_delivery_option;
                    let nearest = Number.MAX_VALUE;
    
                    for (const tile of map.tiles.values()) {
                        if (tile.delivery) {      
                             delivery_options.push( [ 'go_put_down', tile.x, tile.y, tile.delivery ] );
                        }   
                    }
                    
                    for (const option of delivery_options) {
                          let [go_put_down,x,y,delivery] = option;
                            let current_d = distance( {x, y}, me )
                            if ( current_d < nearest ) {
                                best_delivery_option = option
                                nearest = current_d
                            }
                        }
                         
                
                    /**
                     * Best option is selected
                     */
                    if ( best_delivery_option ) {
                        myAgent.push( best_delivery_option )
                    }} else if (this.intention_queue.length == 0 && me.carrying == false && parcel_db.size==0) {
                        console.log("GOES IN PATROLLING IF!")

                   patrolling_case_selection();
                }
            }  else if (this.intention_queue.length == 0 && me.carrying == false) {
                console.log("2 - GOES IN PATROLLING IF!")

                // TODO: Patrolling only if parcel_db is empty, if parcel is in parcel db -> Reasoning function!

                if (parcel_db.size == 0) {        
             
             patrolling_case_selection();


          } else if (parcel_db.size > 0) {

           patrolling_case_selection();

          }

            }  
             else if (this.intention_queue.length == 0 && me.carrying == true) {
                console.log("3 - GOES IN PATROLLING IF!")

            
                //TODO: Additional reasoning if we should deliver or not in case of parcel degredation -> keep in mind only for parcel degredation 
                

                if (parcel_decading_interval == "infinite") {
             
                    patrolling_case_selection();

                } else {

                    console.log("4 - GOES IN PATROLLING IF!")

                 //TODO: Check if parcel db size is 0 or > 0; if 0 -> deliver; if > 0 -> reward function to determine best option; patrolling as a current gap filler
                   
                 patrolling_case_selection();

                }
            }
             
            // Postpone next iteration at setImmediate
            await new Promise( res => setImmediate( res ) );
        }
    }

    // async push ( predicate ) { }

    log ( ...args ) {
        console.log( ...args )
    }

}


class IntentionRevisionQueue extends IntentionRevision {

    async push ( predicate ) { 
            if (this.intention_queue.length == 0) {
        // Check if already queued
        if ( this.intention_queue.find( (i) => i.predicate.join(' ') == predicate.join(' ') ) )
            return; // intention is already queued
        } else {
         
            return; // intention is already queued
        }

        console.log( 'IntentionRevisionReplace.push', predicate );
        const intention = new Intention( this, predicate );
        this.intention_queue.push( intention );
    }
}



/**
 * Start intention revision loop
 */

const myAgent = new IntentionRevisionQueue();

myAgent.loop();



/**
 * Intention
 */
class Intention {

    // Plan currently used for achieving the intention 
    #current_plan;
    
    // This is used to stop the intention
    #stopped = false;
    get stopped () {
        return this.#stopped;
    }
    stop () {
        // this.log( 'stop intention', ...this.#predicate );
        this.#stopped = true;
        if ( this.#current_plan)
            this.#current_plan.stop();
    }

    /**
     * #parent refers to caller
     */
    #parent;

    /**
     * predicate is in the form ['go_to', x, y]
     */
    get predicate () {
        return this.#predicate;
    }
    #predicate;

    constructor ( parent, predicate ) {
        this.#parent = parent;
        this.#predicate = predicate;
    }

    log ( ...args ) {
        if ( this.#parent && this.#parent.log )
            this.#parent.log( '\t', ...args )
        else
            console.log( ...args )
    }

    #started = false;
    /**
     * Using the plan library to achieve an intention
     */
    async achieve () {


        // Cannot start twice
        if ( this.#started)
            return this;
        else
            this.#started = true;

        // Trying all plans in the library
        for (const planClass of planLibrary) {

            // if stopped then quit
            if ( this.stopped ) throw [ 'stopped intention', ...this.predicate ];

            // if plan is 'statically' applicable
            if ( planClass.isApplicableTo( ...this.predicate ) ) {
                // plan is instantiated
                this.#current_plan = new planClass(this.parent);
                this.log('achieving intention', ...this.predicate, 'with plan', planClass.name);
                // and plan is executed and result returned
                try {
                    console.log("tryin to execute into achieve");
                    console.log("predicate: " + this.predicate);
                    const plan_res = await this.#current_plan.execute( ...this.predicate );
                    console.log("plan res: " + plan_res);
                    this.log( 'succesful intention', ...this.predicate, 'with plan', planClass.name, 'with result:', plan_res );
                    
                    return plan_res
                // or errors are caught so to continue with next plan
                } catch (error) {
                    this.log( 'failed intention', ...this.predicate,'with plan', planClass.name, 'with error:', error );
                }
            }

        }

        // if stopped then quit
        if ( this.stopped ) throw [ 'stopped intention', ...this.predicate ];

        // no plans have been found to satisfy the intention
        // this.log( 'no plan satisfied the intention ', ...this.predicate );
        throw ['no plan satisfied the intention ', ...this.predicate ]
    }

}

/**
 * Plan library
 */
const planLibrary = [];

class Plan {

    // This is used to stop the plan
    #stopped = false;
    stop () {
        // this.log( 'stop plan' );
        this.#stopped = true;
        for ( const i of this.#sub_intentions ) {
            i.stop();
        }
    }
    get stopped () {
        return this.#stopped;
    }

    /**
     * #parent refers to caller
     */
    #parent;

    constructor ( parent ) {
        this.#parent = parent;
    }

    log ( ...args ) {
        if ( this.#parent && this.#parent.log )
            this.#parent.log( '\t', ...args )
        else
            console.log( ...args )
    }

    // this is an array of sub intention. Multiple ones could eventually being achieved in parallel.
    #sub_intentions = [];

    async subIntention ( predicate ) {
        const sub_intention = new Intention( this, predicate );
        this.#sub_intentions.push( sub_intention );
        return await sub_intention.achieve();
    }

}

class GoPickUp extends Plan {

    
    static isApplicableTo ( go_pick_up, x, y, id ) {

        return go_pick_up == 'go_pick_up';
    }

    async execute ( go_pick_up, x, y ) {
        if ( this.stopped ) throw ['stopped']; // if stopped then quit
        await this.subIntention( ['go_to', x, y] );
        if ( this.stopped ) throw ['stopped']; // if stopped then quit
        await client.pickup()
        if ( this.stopped ) throw ['stopped']; // if stopped then quit
        me.carrying = true
        me.parcel_count++;
       /*  console.log(parcel_db)
        parcel_db.delete(current_parcel.id)
        console.log("----")
        console.log(parcel_db) */
        current_parcel = null
        return true;
    }

}


class GoPutDown extends Plan {

    static isApplicableTo ( go_put_down, x, y) {
        return go_put_down == 'go_put_down';
    }

    async execute ( go_put_down, x, y ) {
        if ( this.stopped ) throw ['stopped']; // if stopped then quit
        await this.subIntention( ['go_to', x, y] );
        if ( this.stopped ) throw ['stopped']; // if stopped then quit
        await client.putdown()
        if ( this.stopped ) throw ['stopped']; // if stopped then quit
        me.carrying = false
        me.parcel_count = 0;

        for (const [key , parcel] of parcel_db.entries()) {
            console.log("parcel x: " + parcel[0].x + " parcel y: " + parcel[0].y);
            var current_distance = distance_coordinates(parcel[0].x, parcel[0].y, me.x, me.y )
            console.log("CURRENT DISTANCE: "+ current_distance);

        if(current_distance>=parcel_sensing_distance){
            parcel_db.delete(key);
        }
          }

        return true;
    }

}

class Patrolling extends Plan {

    static isApplicableTo (patrolling, x, y) {
        return patrolling == 'patrolling';        
    }

    async execute (patrolling, x , y ) {
        
        if ( this.stopped ) throw ['stopped']; // if stopped then quit      
        await this.subIntention( ['go_to', x, y] );

        return true;
    }
}

class BlindMove extends Plan {

    static isApplicableTo ( go_to, x, y ) {
        return go_to == 'go_to';
    }

    async execute ( go_to, x, y ) {

        while ( me.x != x || me.y != y ) {

            if ( this.stopped ) throw ['stopped']; // if stopped then quit

            let status_x = false;
            let status_y = false;
            
            // this.log('me', me, 'xy', x, y);

            if ( x > me.x )
                status_x = await client.move('right')
                // status_x = await this.subIntention( 'go_to', {x: me.x+1, y: me.y} );
            else if ( x < me.x )
                status_x = await client.move('left')
                // status_x = await this.subIntention( 'go_to', {x: me.x-1, y: me.y} );

            if (status_x) {
                me.x = status_x.x;
                me.y = status_x.y;
            }

            if ( this.stopped ) throw ['stopped']; // if stopped then quit

            if ( y > me.y )
                status_y = await client.move('up')
                // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y+1} );
            else if ( y < me.y )
                status_y = await client.move('down')
                // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y-1} );

            if (status_y) {
                me.x = status_y.x;
                me.y = status_y.y;
            }
            
            if ( ! status_x && ! status_y) {
                this.log('stucked');
                throw 'stucked';
            } else if ( me.x == x && me.y == y ) {
                // this.log('target reached');
            }
            
        }

        return true;

    }
}

// plan classes are added to plan library 
planLibrary.push( GoPickUp )
planLibrary.push( BlindMove )
planLibrary.push( GoPutDown)
planLibrary.push( Patrolling)

