package ru.hexlet.booking.application

/** Обработчик команды, изменяющей состояние. У каждой команды свой интерфейс и одна реализация. */
interface CommandHandler<in C, out R> {
    suspend fun handle(command: C): R
}
