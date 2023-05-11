import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

const client = new DeliverooApi(
    'http://localhost:8080',
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImVlMDkwM2E2MjQ3IiwibmFtZSI6ImRhbmllbCIsImlhdCI6MTY4MzgwNDczNH0.3bkMPWdv4mgdNfKXdXstPg-iSJACI2P1R9d_I-fpNp0"
)

function distance( {x:x1, y:y1}, {x:x2, y:y2}) {
    const dx = Math.abs( Math.round(x1) - Math.round(x2) )
    const dy = Math.abs( Math.round(y1) - Math.round(y2) )
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

const game_map = {}


// client.onConfig((param) => {console.log(param)})  //Needed when we take the sensing distance into calculation

client.onMap((_width, _height, array) => {
        game_map._width = _width
        game_map._height = _height
        game_map.array = array
    })
    
    console.log(game_map)

//client.onTile((x, y, d) => console.log(x, y, d))


/**
 * @type {Map<string,[{id,name,x,y,score}]}
 */
const agent_db = new Map()

/**
 * @type {Map<string,[{id, x, y, carriedBy, reward}]}
 */
const parcel_db = new Map()





client.onParcelsSensing( ( parcels ) => {   //Parcel Sensing and Option generation
    
    
    
   for (const p of parcels) {
      
   if (!parcel_db.has(p.id)) {  //not already in database

        if (p.carriedBy == null  ) {  // not already picked up by somebody else -> Saved in Database

        parcel_db.set( p.id, [p])  
    }
    
    //Only Testrun with Criterium "Nearest Parcel", if it works - reasoning on desicion criteria (distance + reward)

     /**
     * Options generation
     */
     const options = []
     for (const parcel of parcels.values())
         if ( ! parcel.carriedBy ) {
             options.push( [ 'go_pick_up', parcel.x, parcel.y, parcel.id ] );
             }
 
     /**
      * Options filtering
      */
     let best_option;
     let nearest = Number.MAX_VALUE;
     for (const option of options) {
         if ( option[0] == 'go_pick_up' ) {
             let [go_pick_up,x,y,id] = option;
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
     if ( best_option )
         myAgent.push( best_option )

      } else {

        if (p.carriedBy != null) {  //check if carried by somebody -> Delete out of Database
            parcel_db.delete(p.id)
            continue
        }

      var parcel_history = parcel_db.get( p.id )       
    //  console.log(p.id, parcel_history)       //Only for Testing
      
        var last = parcel_history[parcel_history.length -1]

        
        if (last.reward != p.reward) {  //update the value of the parcels
            parcel_db.set(p.id, [p])
            
        parcel_history = parcel_db.get( p.id )
        last = parcel_history[parcel_history.length-1]

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
            // Consumes intention_queue if not empty
            if ( this.intention_queue.length > 0 ) {
                console.log( 'intentionRevision.loop', this.intention_queue.map(i=>i.predicate) );
            
                // Current intention
                const intention = this.intention_queue[0];
                
                //console.log("Intention:", intention.predicate[3])  //only for testing

                // Is queued intention still valid? Do I still want to achieve it?
                // TODO this hard-coded implementation is an example    //Only implemented for parcels which are already picked up, maybe different criterias. We have to test if the code works!!!
                let id = intention.predicate[3]
                let p = parcel_db.get(id)

                //console.log("Parcel:", p) //Only for testing

                if (p.carriedBy == true) {
                    console.log( 'Skipping intention because no more valid', intention.predicate )
                    continue;
                }

                // Start achieving intention
                await intention.achieve()
                // Catch eventual error and continue
                .catch( error => {
                    // console.log( 'Failed intention', ...intention.predicate, 'with error:', ...error )
                } );

                // Remove from the queue
                this.intention_queue.shift();
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
        
        // Check if already queued
        if ( this.intention_queue.find( (i) => i.predicate.join(' ') == predicate.join(' ') ) )
            return; // intention is already queued

        console.log( 'IntentionRevisionReplace.push', predicate );
        const intention = new Intention( this, predicate );
        this.intention_queue.push( intention );
    }

}

class IntentionRevisionReplace extends IntentionRevision {

    async push ( predicate ) {

        // Check if already queued
        const last = this.intention_queue.at( this.intention_queue.length - 1 );
        if ( last && last.predicate.join(' ') == predicate.join(' ') ) {
            return; // intention is already being achieved
        }
        
        console.log( 'IntentionRevisionReplace.push', predicate );
        const intention = new Intention( this, predicate );
        this.intention_queue.push( intention );
        
        // Force current intention stop 
        if ( last ) {
            last.stop();
        }
    }

}

class IntentionRevisionRevise extends IntentionRevision {

    async push ( predicate ) {
        console.log( 'Revising intention queue. Received', ...predicate );
        // TODO //Here put down function?
        // - order intentions based on utility function (reward - cost) (for example, parcel score minus distance)
        // - eventually stop current one
        // - evaluate validity of intention
    }

}

/**
 * Start intention revision loop
 */

// const myAgent = new IntentionRevisionQueue();
const myAgent = new IntentionRevisionReplace();
// const myAgent = new IntentionRevisionRevise();
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
                    const plan_res = await this.#current_plan.execute( ...this.predicate );
                    this.log( 'succesful intention', ...this.predicate, 'with plan', planClass.name, 'with result:', plan_res );
                    return plan_res
                // or errors are caught so to continue with next plan
                } catch (error) {
                    this.log( 'failed intention', ...this.predicate,'with plan', planClass.name, 'with error:', ...error );
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






 






