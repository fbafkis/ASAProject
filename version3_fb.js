import { DeliverooApi } from "@unitn-asa/deliveroo-js-client";

const client = new DeliverooApi(
    'http://localhost:8080',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImI4NWY1MWE4ZTg4IiwibmFtZSI6ImRvZmIiLCJpYXQiOjE2OTEwNDk3NzV9.n0wlpwc5301NNDfJtxG7rs4sd9MsYTFaClHMxYD61mA')

function distance({ x: x1, y: y1 }, { x: x2, y: y2 }) {
    const dx = Math.abs(Math.round(x1) - Math.round(x2))
    const dy = Math.abs(Math.round(y1) - Math.round(y2))
    return dx + dy;
}

function distance_coordinates(target_x, target_y, tile_x, tile_y) {
    const dx = Math.abs(Math.round(target_x) - Math.round(tile_x))
    const dy = Math.abs(Math.round(target_y) - Math.round(tile_y))
    return dx + dy;
}

/**
 * Beliefset revision function
 */
const me = {};

client.onYou(({ id, name, x, y, score, carrying }) => {
    me.id = id
    me.name = name
    me.x = x
    me.y = y
    me.score = score
    me.carrying = false
})

var parcel_decading_interval;
var parcel_sensing_distance;
var parcels_in_the_scope = false;
var delivery_tiles_database = [];

var current_parcel;

client.onConfig((config) => {
    parcel_decading_interval = config.PARCEL_DECADING_INTERVAL;
    parcel_sensing_distance = config.PARCELS_OBSERVATION_DISTANCE;

    console.log("DECADING INTERVAL:");
    console.log(parcel_decading_interval);

    if (parcel_decading_interval != 'infinite') {

        console.log("DECADING PRESENT");


    }

})

const map = {
    width: undefined,
    height: undefined,
    tiles: new Map(),
    add: function (tile) {
        const { x, y } = tile;
        return this.tiles.set(x + 1000 * y, tile);
    },
    xy: function (x, y) {
        return this.tiles.get(x + 1000 * y)
    }
};
client.onMap((width, height, tiles) => {
    map.width = width;
    map.height = height;
    for (const t of tiles) {
        map.add(t);
        //Add delivery tiles to delivery tiles db.
        if (t.delivery) {
            delivery_tiles_database.push(t);
        }
    }
})

client.onTile((x, y, delivery) => {
    map.add({ x, y, delivery });
})

var first = true;

//TODO: Other Solution for complexer maps - Maybe put number of entries as a list
var patrolling_area = false;

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



client.onParcelsSensing(async (perceived_parcels) => {

    for (const p of perceived_parcels) {

        if (!parcel_db.has(p.id)) {  //not already in database

            if (p.carriedBy == null) {  // not already picked up by somebody else -> Saved in Database

                parcel_db.set(p.id, [p])
            }
        } else {

            if (p.carriedBy != null) {  //check if carried by somebody -> Delete out of Database
                parcel_db.delete(p.id)
            }
        }
    }
})




/**
 * Options generation and filtering function
 */
client.onParcelsSensing(parcels => {

    // TODO revisit beliefset revision so to trigger option generation only in the case a new parcel is observed

    if (first == true) {

        var target_x;
        var target_y;

        //Use Center of the Map as Patrolling Aim
        /* if (map.height % 2 == 0) {
             if (map.width % 2 == 0) {
             target_y = map.height / 2;
             target_x = map.width / 2; 
             } else {
             target_y = map.height / 2;
             target_x = (map.width / 2) + 1;
         }
         } else {
             target_y = (map.height / 2) + 1;
             target_x = (map.width / 2);
         }
         */

        //Divide Map in 3rds and patroll between 1/3 and 2/3
        target_y = Math.floor(map.height / 3) + 1;
        target_x = Math.floor(map.width / 3) + 1;

        patrolling_x_coordinates.set("1", target_x);
        patrolling_y_coordinates.set("1", target_y);

        patrolling_x_coordinates.set("2", (target_x * 2));
        patrolling_y_coordinates.set("2", (target_y * 2));





        var closest = Number.MAX_VALUE;
        var center_tile;

        for (const tile of map.tiles.values()) {
            let current_d = distance_coordinates(target_x, target_y, tile.x, tile.y)
            if (current_d < closest) {
                closest = current_d
                center_tile = tile
            }
        }
        first = false;
    }

    /**
     * Options generation
     */
    const options = []

    if (me.carrying == false) {
        for (const parcel of parcels.values()) {
            if (!parcel.carriedBy)
                options.push(['go_pick_up', parcel.x, parcel.y, parcel.id]);
        }
    } else if (me.carrying = true) {
        for (const tile of map.tiles.values()) {
            if (tile.delivery) {
                options.push(['go_put_down', tile.x, tile.y, tile.delivery]);
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
   
    //Distance reward function
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

    ///////////////////////////////////////////////////////////

    /// 1. Finding the nearest delviery tile respect to the current position of the agent. 

    if (me.carrying && PARCEL_DECADING_INTERVAL != 'infinite') {

        let valid_parcels = new Map;

        var direct_min_del_tile_distance = -1;
        var agent_nearest_delivery_tile;
        delivery_tiles_database.forEach(dt => {
            let distance = distance_coordinates(dt.x, dt.y, me.x, me.y);
            if (direct_min_del_tile_distance == -1) {
                direct_min_del_tile_distance = distance;
                agent_nearest_delivery_tile = dt;
            } else {
                if (distance < direct_min_del_tile_distance)
                    direct_min_del_tile_distance = distance;
                agent_nearest_delivery_tile = dt;
            }
        });

        /// 2. Calculate the estimated final score for each parcel that is carried right 
        /// now in case of direct delivery (no picking up new parcels). 

        let decading_factor;

        switch (PARCEL_DECADING_INTERVAL) {
            case '1s': decading_factor = 1;

                break;

            case '2s': decading_factor = 0.5;

                break;

            case '5s': decading_factor = 0.2;

                break;

            case '10s': decading_factor = 0.1;

            default: decading_factor = 0;
                break;
        }

        var my_parcels_db_no_pickup = new Map;

        for (const [key, p] of parcel_db.entries()) {
            if (p[0].carriedBy == me.id) {
                let final_reward = p[0].reward - Math.round(direct_min_del_tile_distance * decading_factor);
                if (final_reward < 0)
                    final_reward = 0;
                my_parcels_db_no_pickup.set(p[0], final_reward);
            }
        }

        /// 3. Calculate the agent final reward (sum) in case of direct delivery (no picking up new parcels).

        var agent_total_final_reward_no_pickup = 0;

        for (const [parcel, final_reward] of my_parcels_db_no_pickup.entries()) {
            agent_total_final_reward_no_pickup += final_reward;
        }

        /// 4. The loop to estimate for each perceived parcel the final reward in case of picking up 

        for (const [key, p] of parcel_db.entries()) {

            ///  4.1 Find and calulate related distance of the nearest delivery tile for the current analyzed parcel. 

            let parcel_min_del_tile_distance = -1;
            var parcel_nearest_delivery_tile;
            delivery_tiles_database.forEach(dt => {
                let distance = distance_coordinates(dt.x, dt.y, p[0].x, p[0].y);
                if (parcel_min_del_tile_distance == -1) {
                    parcel_min_del_tile_distance = distance;
                    parcel_nearest_delivery_tile = dt;
                } else {
                    if (distance < parcel_min_del_tile_distance)
                        parcel_min_del_tile_distance = distance;
                    parcel_nearest_delivery_tile = dt;
                }
            });

            /// 4.2 Calculating also the distance between the agent and the currently analyzed parcel. Then the sum of 
            /// delivery tile - parcel distance and agent - parcel distance is computed to obtain the total distance for the 
            /// currently analyzed parcel. 

            let parcel_agent_distance = distance(p[0].x, p[0].y, me.x, me.y);

            var parcel_total_distance = parcel_min_del_tile_distance + parcel_agent_distance;

            /// 4.3 Calculate the final score for each parcel currently carried by the agent. 

            let my_parcels_db_pickup = new Map;

            for (const [key, p] of parcel_db.entries()) {
                if (p[0].carriedBy == me.id) {
                    let final_reward = p[0].reward - Math.round(parcel_total_distance * decading_factor);
                    if (final_reward < 0)
                        final_reward = 0;
                    my_parcels_db_pickup.set(p[0], final_reward);
                }
            }

            /// 4.4 Calculate the currently analyzed parcel final reward.


            let current_parcel_final_reward = p[0].final_reward - Math.round(parcel_total_distance * decading_factor);

            if (current_parcel_final_reward < 0) {
                current_parcel_final_reward = 0;
            }

            /// 4.5 Calculating the agent final reward (sum of all carried parcels + currently analyzed perceived parcel reward estimations).

            var agent_total_final_reward_pickup = current_parcel_final_reward;

            for (const [key, final_reward] of my_parcels_db_pickup.entries()) {
                agent_total_final_reward_pickup += final_reward;
            }

            /// 4.5 Comparison between the agent's final reward in the case of picking up the currently analyzed perceived parcel vs. the case of not picking up any parcel. 
            /// If picking up the parcel grants a gain in terms of reward, the currently analyzed perceived parcel is added to the list of valid parcels. 

            if (agent_total_final_reward_pickup > agent_total_final_reward_no_pickup) {
                valid_parcels.set(agent_total_final_reward_pickup, p[0]);
            }


        }  /// End of perceived parcels loop. 


        /// 5. Check if there is any parcel in the list of the valid parcels (the perceived parcel that likely, due to the estimation done, 
        /// will grant a gain in terms of agent's total final reward). If the list is empty the go_delivery option is selected as the best one. 
        /// Otherwise the go_pickup option for the parcel that grants the highest reward is selected as the best one. 

        if (valid_parcels.length > 0) {

            var best_parcel;
            var highest_reward = 0;

            for (const [reward, parcel] of valid_parcels.entries()) {

                if (reward > highest_reward){
                    highest_reward = reward;
                    best_parcel = parcel[0];
                }
            }

            ///TODO: set as best option gopickup the best parcel. 
            
            

        } else {
            let [go_put_down, x, y, delivery] = option;
            option.x = agent_nearest_delivery_tile.x;
            option.y = agent_nearest_delivery_tile.y;

            best_option = option; /// ???????????????????????????????????????????????????????
        }

    } ////// END OF WORK IN PROGRESS 

    let highest_value = 0;
    for (const option of options) {
        if (option[0] == 'go_pick_up') {
            let [go_pick_up, x, y, id] = option;
            let parcel = parcel_db.get(id)
            if (parcel.reward > highest_value)
                highest_value = parcel.reward;
            best_option = option;

        } else if (option[0] == 'go_put_down') {
            let [go_put_down, x, y, delivery] = option;
            let current_d = distance({ x, y }, me)
            if (current_d < nearest) {
                best_option = option
                nearest = current_d
            }
        }
    }




    /**
     * Best option is selected
     */
    if (best_option) {
        // console.log(best_option)
        if (best_option[0] == "go_pick_up")
            current_parcel = parcel_db.get(best_option.id)
        myAgent.push(best_option)
    }

})

client.onAgentsSensing((agents) => {

    for (const a of agents) {

        if (a.x % 1 != 0 || a.y % 1 != 0) // skip intermediate values (0.6 or 0.4)
            continue;

        // I meet someone for the first time
        if (!agent_db.has(a.id)) {

            agent_db.set(a.id, [a])

        } else { // I remember him

            // this is everything I know about him
            const history = agent_db.get(a.id)

            // this is about the last time I saw him
            const last = history[history.length - 1]
            const second_last = (history.length > 2 ? history[history.length - 2] : 'no knowledge')

            if (last != 'lost') { // I was seeing him also last time

                if (last.x != a.x || last.y != a.y) { // But he moved

                    history.push(a)

                }

            } else { // I see him again after some time

                history.push(a)

                if (second_last.x != a.x || second_last.y != a.y) {
                    console.log('Welcome back, seems that you moved', a.name, "; Your Score is: ", a.score)
                } else {
                    console.log('Welcome back, seems you are still here as before', a.name, "; Your Score is: ", a.score)
                }

            }

        }

    }

    for (const [id, history] of agent_db.entries()) {

        const last = history[history.length - 1]
        const second_last = (history.length > 1 ? history[history.length - 2] : 'no knowledge')

        if (!agents.map(a => a.id).includes(id)) {
            // If I am not seeing him anymore

            if (last != 'lost') {
                // Just went off

                history.push('lost');
                console.log('Bye', last.name);

            }

        }

    }

})



/**
 * Intention revision loop
 */
class IntentionRevision {

    #intention_queue = new Array();
    get intention_queue() {
        return this.#intention_queue;
    }

    async loop() {
        while (true) {
            // console.log("int queue lenght: " + this.intention_queue.length + " parcel db size: "+ parcel_db.size + " me.carrying: " + me.carrying);
            // Consumes intention_queue if not empty
            if (this.intention_queue.length > 0) {
                console.log('intentionRevision.loop', this.intention_queue.map(i => i.predicate));

                // Current intention
                const intention = this.intention_queue[0];

                console.log("pred[0]: " + intention.predicate[2]);

                if (intention.predicate != "patrolling") {
                    // Is queued intention still valid? Do I still want to0 achieve it?
                    // TODO this hard-coded implementation is an example -> FUTURE SELFS: Add case for Put Down
                    let id = intention.predicate[2]
                    let p = parcel_db.get(id)
                    if (p && p.carriedBy) {
                        console.log('Skipping intention because no more valid', intention.predicate)
                        continue;
                    }
                }
                // Start achieving intention

                await intention.achieve()
                    // Catch eventual error and continue
                    .catch(error => {
                        // console.log( 'Failed intention', ...intention.predicate, 'with error:', ...error )
                        console.log(error);
                    });

                //console.log(this.intention_queue.length)

                // Remove from the queue
                this.intention_queue.shift();

                /*  console.log("")
                 console.log(this.intention_queue.length) */

                if (this.intention_queue.length == 0 && me.carrying == false && parcel_db.size == 0) {
                    //   console.log("queue empty and not carrying and parcel db")
                    //   console.log("parcel db size: "+ parcel_db.size);
                    let idle;
                    if (patrolling_area == false) {
                        idle = ['patrolling', patrolling_x_coordinates.get("1"), patrolling_y_coordinates.get("1")];
                        patrolling_area = true;
                    } else {
                        idle = ['patrolling', patrolling_x_coordinates.get("2"), patrolling_y_coordinates.get("2")];
                        patrolling_area = false;
                    }
                    myAgent.push(idle)
                }

                /* console.log("")
                console.log(this.intention_queue.length) */
            } else if (this.intention_queue.length == 0 && me.carrying == false && parcel_db.size == 0) {
                // TODO: Why does not only else work?!
                //  console.log("queue empty and not carrying and parcel db")
                //  console.log("parcel db size: "+ parcel_db.size);
                let idle;
                if (patrolling_area == false) {
                    idle = ['patrolling', patrolling_x_coordinates.get("1"), patrolling_y_coordinates.get("1")];
                    patrolling_area = true;
                } else {
                    idle = ['patrolling', patrolling_x_coordinates.get("2"), patrolling_y_coordinates.get("2")];
                    patrolling_area = false;
                }
                myAgent.push(idle)
            }
            // Postpone next iteration at setImmediate
            await new Promise(res => setImmediate(res));
        }
    }

    // async push ( predicate ) { }

    log(...args) {
        console.log(...args)
    }

}

class IntentionRevisionQueue extends IntentionRevision {


    async push(predicate) {
        if (this.intention_queue.length == 0) {
            // Check if already queued
            if (this.intention_queue.find((i) => i.predicate.join(' ') == predicate.join(' ')))
                return; // intention is already queued
        } else {

            return; // intention is already queued
        }

        console.log('IntentionRevisionReplace.push', predicate);
        const intention = new Intention(this, predicate);
        this.intention_queue.push(intention);
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
    get stopped() {
        return this.#stopped;
    }
    stop() {
        // this.log( 'stop intention', ...this.#predicate );
        this.#stopped = true;
        if (this.#current_plan)
            this.#current_plan.stop();
    }

    /**
     * #parent refers to caller
     */
    #parent;

    /**
     * predicate is in the form ['go_to', x, y]
     */
    get predicate() {
        return this.#predicate;
    }
    #predicate;

    constructor(parent, predicate) {
        this.#parent = parent;
        this.#predicate = predicate;
    }

    log(...args) {
        if (this.#parent && this.#parent.log)
            this.#parent.log('\t', ...args)
        else
            console.log(...args)
    }

    #started = false;
    /**
     * Using the plan library to achieve an intention
     */
    async achieve() {


        // Cannot start twice
        if (this.#started)
            return this;
        else
            this.#started = true;

        // Trying all plans in the library
        for (const planClass of planLibrary) {

            // if stopped then quit
            if (this.stopped) throw ['stopped intention', ...this.predicate];

            // if plan is 'statically' applicable
            if (planClass.isApplicableTo(...this.predicate)) {
                // plan is instantiated
                this.#current_plan = new planClass(this.parent);
                this.log('achieving intention', ...this.predicate, 'with plan', planClass.name);
                // and plan is executed and result returned
                try {
                    console.log("tryin to execute into achieve");
                    console.log("predicate: " + this.predicate);
                    const plan_res = await this.#current_plan.execute(...this.predicate);
                    console.log("plan res: " + plan_res);
                    this.log('succesful intention', ...this.predicate, 'with plan', planClass.name, 'with result:', plan_res);

                    return plan_res
                    // or errors are caught so to continue with next plan
                } catch (error) {
                    this.log('failed intention', ...this.predicate, 'with plan', planClass.name, 'with error:', error);
                }
            }

        }

        // if stopped then quit
        if (this.stopped) throw ['stopped intention', ...this.predicate];

        // no plans have been found to satisfy the intention
        // this.log( 'no plan satisfied the intention ', ...this.predicate );
        throw ['no plan satisfied the intention ', ...this.predicate]
    }

}

/**
 * Plan library
 */
const planLibrary = [];

class Plan {

    // This is used to stop the plan
    #stopped = false;
    stop() {
        // this.log( 'stop plan' );
        this.#stopped = true;
        for (const i of this.#sub_intentions) {
            i.stop();
        }
    }
    get stopped() {
        return this.#stopped;
    }

    /**
     * #parent refers to caller
     */
    #parent;

    constructor(parent) {
        this.#parent = parent;
    }

    log(...args) {
        if (this.#parent && this.#parent.log)
            this.#parent.log('\t', ...args)
        else
            console.log(...args)
    }

    // this is an array of sub intention. Multiple ones could eventually being achieved in parallel.
    #sub_intentions = [];

    async subIntention(predicate) {
        const sub_intention = new Intention(this, predicate);
        this.#sub_intentions.push(sub_intention);
        return await sub_intention.achieve();
    }

}

class GoPickUp extends Plan {


    static isApplicableTo(go_pick_up, x, y, id) {

        return go_pick_up == 'go_pick_up';
    }

    async execute(go_pick_up, x, y) {
        if (this.stopped) throw ['stopped']; // if stopped then quit
        await this.subIntention(['go_to', x, y]);
        if (this.stopped) throw ['stopped']; // if stopped then quit
        await client.pickup()
        if (this.stopped) throw ['stopped']; // if stopped then quit
        me.carrying = true
        /*  console.log(parcel_db)
         parcel_db.delete(current_parcel.id)
         console.log("----")
         console.log(parcel_db) */
        current_parcel = null
        return true;
    }

}


class GoPutDown extends Plan {

    static isApplicableTo(go_put_down, x, y) {
        return go_put_down == 'go_put_down';
    }

    async execute(go_put_down, x, y) {
        if (this.stopped) throw ['stopped']; // if stopped then quit
        await this.subIntention(['go_to', x, y]);
        if (this.stopped) throw ['stopped']; // if stopped then quit
        await client.putdown()
        if (this.stopped) throw ['stopped']; // if stopped then quit
        me.carrying = false

        for (const [key, parcel] of parcel_db.entries()) {
            console.log("parcel x: " + parcel[0].x + " parcel y: " + parcel[0].y);
            var current_distance = distance_coordinates(parcel[0].x, parcel[0].y, me.x, me.y)
            console.log("CURRENT DISTANCE: " + current_distance);

            if (current_distance >= parcel_sensing_distance) {
                parcel_db.delete(key);
            }
        }

        return true;
    }

}

class Patrolling extends Plan {

    static isApplicableTo(patrolling, x, y) {
        return patrolling == 'patrolling';
    }

    async execute(patrolling, x, y) {

        if (this.stopped) throw ['stopped']; // if stopped then quit      
        await this.subIntention(['go_to', x, y]);

        return true;
    }
}

class BlindMove extends Plan {

    static isApplicableTo(go_to, x, y) {
        return go_to == 'go_to';
    }

    async execute(go_to, x, y) {

        while (me.x != x || me.y != y) {

            if (this.stopped) throw ['stopped']; // if stopped then quit

            let status_x = false;
            let status_y = false;

            // this.log('me', me, 'xy', x, y);

            if (x > me.x)
                status_x = await client.move('right')
            // status_x = await this.subIntention( 'go_to', {x: me.x+1, y: me.y} );
            else if (x < me.x)
                status_x = await client.move('left')
            // status_x = await this.subIntention( 'go_to', {x: me.x-1, y: me.y} );

            if (status_x) {
                me.x = status_x.x;
                me.y = status_x.y;
            }

            if (this.stopped) throw ['stopped']; // if stopped then quit

            if (y > me.y)
                status_y = await client.move('up')
            // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y+1} );
            else if (y < me.y)
                status_y = await client.move('down')
            // status_x = await this.subIntention( 'go_to', {x: me.x, y: me.y-1} );

            if (status_y) {
                me.x = status_y.x;
                me.y = status_y.y;
            }

            if (!status_x && !status_y) {
                this.log('stucked');
                throw 'stucked';
            } else if (me.x == x && me.y == y) {
                // this.log('target reached');
            }

        }

        return true;

    }
}

// plan classes are added to plan library 
planLibrary.push(GoPickUp)
planLibrary.push(BlindMove)
planLibrary.push(GoPutDown)
planLibrary.push(Patrolling)

