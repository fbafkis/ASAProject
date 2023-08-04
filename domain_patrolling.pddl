;; domain file: domain_patrolling.pddl

(define (domain default)
    (:requirements :strips)
    (:predicates
        (tile ?t)
        (agent ?a)
        (me ?a)
        (at ?agent ?tile)
        (right ?t1 ?t2)
        (left ?t1 ?t2)
        (up ?t1 ?t2)
        (down ?t1 ?t2)
    )

    (:action right
        :parameters (?me ?from ?to)
        :precondition (and (me ?me) (at ?me ?from))
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
        )
    )

     (:action left
        :parameters (?me ?from ?to)
        :precondition (and (me ?me) (at ?me ?from))
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
        )
    )

     (:action up
        :parameters (?me ?from ?to)
        :precondition (and (me ?me) (at ?me ?from))
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
        )
    )

     (:action down
        :parameters (?me ?from ?to)
        :precondition (and (me ?me) (at ?me ?from))
        :effect (and
            (at ?me ?to)
            (not (at ?me ?from))
        )
    )

)