package ru.hexlet.booking.presentation

import io.ktor.server.application.Application
import io.ktor.server.config.ApplicationConfig
import io.ktor.server.testing.ApplicationTestBuilder
import io.ktor.server.testing.testApplication
import org.koin.core.module.Module
import org.koin.dsl.module
import ru.hexlet.booking.application.Clock

/** Модуль, подменяющий `Clock` переданными часами. */
fun clockModule(clock: Clock): Module = module { single<Clock> { clock } }

/**
 * Приложение для теста: модули создаются заново на каждый вызов, поэтому хранилище в памяти свежее.
 * [overrides] заменяют определения из любого слоя.
 */
fun testBooking(
    clock: TestClock = TestClock(),
    overrides: List<Module> = emptyList(),
    block: suspend ApplicationTestBuilder.() -> Unit,
) = testApplication {
    application { testModule(clock, *overrides.toTypedArray()) }
    block()
}

/** То же для тестов, которым нужно самим добавить маршруты: вызывается внутри `application { }`. */
fun Application.testModule(
    clock: Clock = TestClock(),
    vararg overrides: Module,
) = configureApp(defaultModules(ApplicationConfig("application.conf")) + clockModule(clock) + overrides)
