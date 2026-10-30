package ru.hexlet.booking.application

/** Обработчик запроса, который только читает данные. У каждого запроса свой интерфейс и одна реализация. */
interface QueryHandler<in Q, out R> {
    suspend fun handle(query: Q): R
}
